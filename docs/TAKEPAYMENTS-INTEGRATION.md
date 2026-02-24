# TakePayments Integration

## Overview

The CRM integrates with **TakePayments** (TP Online Payments 2) to accept online card payments for job payment milestones. TakePayments provides a **hosted payment form** — the customer is redirected to TakePayments' own page to enter card details, so the CRM never handles raw card data and avoids PCI compliance burden.

Payments are tied to **job payment schedule items** (milestones). Each milestone (e.g. "Deposit", "Balance") can be paid independently via card or marked as manually paid.

## Architecture

### Payment Flow

There are two ways to initiate a payment:

1. **Staff-initiated (authenticated)** — Staff clicks a pay button on the job detail page. Uses `POST /api/payments/initiate`.
2. **Customer-initiated (payment link)** — Staff generates a shareable link, sends it to the customer. Customer visits `/pay/{token}`, clicks "Pay", and is redirected to TakePayments. Uses `POST /api/public/payments/initiate-from-token`.

Both flows produce the same result: a set of form fields that are auto-submitted via a hidden HTML form to TakePayments' hosted payment page.

### Dual Result Processing

After the customer completes (or abandons) payment on the TakePayments form, two things happen in parallel:

#### Path 1: Server-to-Server Result (authoritative)

```
TakePayments POSTs to → POST /api/public/payments/server-result
  → Verify HashDigest
  → Validate amount matches original request
  → Update payment_attempts record
  → If successful, mark milestone as paid
  → Return acknowledgment to TakePayments
```

This is the **authoritative** path. Payment is recorded even if the customer closes their browser.

#### Path 2: Browser Redirect (informational)

```
TakePayments redirects customer browser to → GET /api/public/payments/callback
  → Verify callback HashDigest
  → Log callback timestamp
  → Redirect to /payment/success or /payment/failure
```

This is **informational only**. The payment has already been recorded by the server result. This path just shows the customer a success/failure page.

### Payment Link Tokens

Payment links use a custom JWT-like token (base64url payload + HMAC-SHA256 signature). The token contains:

- `milestoneId` — which milestone to pay
- `tenantId` — which tenant owns the milestone
- `amount` — the expected amount (for display)
- `exp` — expiry timestamp (7 days from creation)

Tokens are signed with `PAYMENT_TOKEN_SECRET` and verified with timing-safe comparison.

## Database Schema

### `takepayments_settings`

One row per tenant. Stores gateway credentials.

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | UUID |
| `tenant_id` | text (unique, FK → tenants) | Owning tenant |
| `merchant_id` | text | PAYZON-XXXXXXX format |
| `gateway_password_encrypted` | text | AES-256-GCM encrypted gateway password |
| `pre_shared_key_encrypted` | text | AES-256-GCM encrypted pre-shared key |
| `hash_method` | text | `SHA1` or `HMACSHA1` |
| `is_active` | boolean | Enable/disable payments for this tenant |

### `payment_attempts`

Audit trail. One row per payment attempt.

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | UUID |
| `tenant_id` | text (FK → tenants) | |
| `milestone_id` | text (FK → job_payment_schedule_items) | |
| `job_id` | text (FK → jobs) | |
| `order_id` | text (unique) | Format: `JOB-{jobNumber}-MS-{milestoneId first 8}-{UUID first 8}` |
| `amount` | integer | Amount in **pence** |
| `status_code` | integer | TakePayments StatusCode (0 = success) |
| `message` | text | TakePayments message |
| `cross_reference` | text | TakePayments transaction reference |
| `card_last_four` | text | Last 4 digits of card used |
| `card_type` | text | e.g. VISA, MASTERCARD |
| `three_d_secure_result` | text | 3DS authentication result |
| `raw_response` | jsonb | Full POST body from server result |
| `hash_verified` | boolean | Whether hash verification passed |
| `status` | text | `pending`, `success`, `failed`, or `error` |
| `server_result_received_at` | timestamp | When server-to-server result arrived |
| `callback_received_at` | timestamp | When browser redirect arrived |

### `job_payment_schedule_items` (payment-related columns)

These columns were added to the existing milestones table:

| Column | Type | Description |
|---|---|---|
| `paid_amount` | numeric(10,2) | Running total paid (default 0) |
| `paid_at` | timestamp | When fully paid |
| `payment_method` | text | `manual`, `card`, or `bank_transfer` |
| `external_payment_id` | text | Reserved for future Stripe integration |
| `takepayments_cross_reference` | text | CrossReference from last successful payment |
| `takepayments_status_code` | integer | TakePayments StatusCode (0 = success) |
| `card_last_four` | text | Last 4 digits of card used |

## API Endpoints

### Authenticated (require login + tenant)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/payments/initiate` | Generate TakePayments form data for a milestone |
| `POST` | `/api/payments/generate-link` | Create a shareable payment link (7-day expiry) |
| `GET` | `/api/tenant/takepayments-settings` | Get settings (credentials masked) |
| `PUT` | `/api/tenant/takepayments-settings` | Create/update settings |
| `POST` | `/api/tenant/takepayments-settings/test` | Test that stored credentials decrypt correctly |

### Public (no auth)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/public/payments/server-result` | Server-to-server payment result from TakePayments |
| `GET` | `/api/public/payments/callback` | Browser redirect after payment |
| `POST` | `/api/public/payments/validate-token` | Validate a payment link token, return milestone details |
| `POST` | `/api/public/payments/initiate-from-token` | Initiate payment from a public payment link |
| `GET` | `/api/public/payments/status?orderId=X` | Get payment attempt status (for success/failure pages) |

## Frontend Pages

| Route | Component | Description |
|---|---|---|
| Settings → Payments tab | `payments-tab.tsx` | Configure TakePayments credentials |
| Job detail → Payment Schedule tab | `job-detail.tsx` | View milestones, generate links, mark paid |
| `/pay/:token` | `payment.tsx` | Public payment page — validates token, shows details, initiates payment |
| `/payment/success` | `payment-success.tsx` | Post-payment success page with transaction details |
| `/payment/failure` | `payment-failure.tsx` | Post-payment failure page with error message |

## Security

### Credential Encryption (AES-256-GCM)

Gateway password and pre-shared key are encrypted at rest using AES-256-GCM before being stored in the database.

- **Algorithm**: AES-256-GCM with 12-byte random IV and 16-byte auth tag
- **Storage format**: `{iv}:{authTag}:{ciphertext}` (all base64)
- **Key**: `TAKEPAYMENTS_ENCRYPTION_KEY` env var (32 bytes / 64 hex characters)
- **Implementation**: `apps/api/src/lib/encryption.ts`

### Hash Verification

TakePayments uses hash digests to ensure requests and responses haven't been tampered with. Three hash contexts exist:

- **REQUEST** (45+ fields) — sent with the payment form submission
- **RESPONSE** (31 fields) — received in the server-to-server result
- **CALLBACK** (5 fields) — received in the browser redirect

Each context has a specific field order defined in the TakePayments specification. The hash method (SHA1 or HMACSHA1) is configurable per tenant:

- **SHA1**: PreSharedKey is included in the hash string, then SHA1'd
- **HMACSHA1**: PreSharedKey is used as the HMAC key, excluded from the hash string

Implementation: `apps/api/src/lib/takepayments-hash.ts`

### Additional Security Measures

- **Amount validation**: The server result handler checks that the returned amount matches the original payment attempt
- **Idempotency**: Duplicate processing is prevented — once a payment attempt moves from `pending`, it won't be reprocessed
- **Duplicate transactions (StatusCode 20)**: Handled by checking `PreviousStatusCode` for the original outcome
- **Timing-safe comparison**: Payment link token signatures are verified using `crypto.timingSafeEqual`
- **Token expiry**: Payment links expire after 7 days

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `TAKEPAYMENTS_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption of credentials | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `PAYMENT_TOKEN_SECRET` | 32-byte hex key for HMAC-SHA256 payment link tokens | Generate: same as above |
| `API_BASE_URL` | Public URL of the API server. Used for `ServerResultURL` and `CallbackURL`. | `https://api.example.com` |
| `APP_URL` | Public URL of the frontend. Used for redirect destinations after payment. | `https://app.example.com` |

## Key Files

| File | Purpose |
|---|---|
| `packages/shared/src/db/schema.ts` | Database schema (search for `takepaymentsSettings`, `paymentAttempts`) |
| `packages/shared/drizzle/0026_motionless_christian_walker.sql` | Migration that adds payment tables/columns |
| `apps/api/src/routes/payments.ts` | Authenticated payment routes (initiate, generate link) |
| `apps/api/src/routes/public-payments.ts` | Public payment routes (server result, callback, token validation) |
| `apps/api/src/routes/takepayments-settings.ts` | Settings CRUD routes |
| `apps/api/src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt |
| `apps/api/src/lib/takepayments-hash.ts` | Hash computation and verification |
| `apps/api/src/lib/payment-token.ts` | Payment link token creation and verification |
| `apps/web/src/components/customer/settings/payments-tab.tsx` | Settings UI |
| `apps/web/src/pages/public/payment.tsx` | Public payment page |
| `apps/web/src/pages/public/payment-success.tsx` | Success page |
| `apps/web/src/pages/public/payment-failure.tsx` | Failure page |
| `apps/web/src/hooks/use-takepayments-settings.ts` | React Query hooks for settings |
| `apps/web/src/hooks/use-jobs.ts` | Contains payment-related mutations (`useGeneratePaymentLinkMutation`, `useInitiatePaymentMutation`) |

---

## Testing Strategy

### How the Test Environment Works

TakePayments does **not** have a separate sandbox or staging environment. Instead, your account comes with **two gateway accounts** — a live one and a test one. Both use the same gateway URL (`mms.tponlinepayments2.com`), but the test account connects to a **simulator** that emulates an Acquirer and returns simulated authorisation responses.

This means:
- You still POST to the real gateway URL — the simulator is activated based on your test Merchant Account ID
- No real money is charged
- The simulator uses the **transaction amount** and **card expiry month** to determine the outcome (see below)

### Prerequisites

#### 1. TakePayments Test Gateway Credentials

TakePayments provides separate **test** gateway credentials alongside your live ones. You need:

- **Test Merchant ID** (format: `PAYZON-XXXXXXX`)
- **Test Gateway Password**
- **Test Pre-Shared Key**

To find these:

1. Log into the **Merchant Management System (MMS)** at `mms.tponlinepayments2.com`
2. Go to **Account Admin → Gateway Account Admin**
3. You should see both a Live and a Test gateway account
4. The test gateway password is emailed to the merchant super user on account setup

If you don't see a test account, contact Paymentsense gateway support at **gatewaysupport@paymentsense.com**.

#### 2. Test Card Numbers

Test accounts use a simulator (not connected to a real Acquirer). Use these test cards on the TakePayments hosted payment form with test credentials:

**Visa Credit:**

| Card Number | CVV | Address |
|---|---|---|
| `4929 4212 3460 0821` | `356` | Flat 6, Primrose Rise, 347 Lavender Road, Northampton, NN17 8YG |
| `4543 0599 9999 9982` | `110` | 76 Roseby Avenue, Manchester, M63X 7TH |

**Mastercard Credit:**

| Card Number | CVV | Address |
|---|---|---|
| `5301 2500 7000 0191` | `419` | 25 The Larches, Narborough, Leicester, LE10 2RT |
| `5413 3390 0000 1000` | `304` | Pear Tree Cottage, The Green, Milton Keynes, MK11 7UY |

**Mastercard Debit:**

| Card Number | CVV | Address |
|---|---|---|
| `5573 4712 3456 7898` | `159` | Merevale Avenue, Leicester, LE10 2BU |

Use an expiry date in the near future (e.g. `01/27`). The **expiry month** controls 3-D Secure simulation:

| Expiry Month | 3DS Result |
|---|---|
| 01 (Jan) | Fully authenticated |
| 02 (Feb) | Not authenticated |
| 03 (Mar) | Unknown authentication status |
| 12 (Dec) | Frictionless not possible, challenge Cardholder |

#### 3. Test Amounts

The transaction **amount** (in pence) controls the simulator outcome:

| Amount Range | Authorisation Response | Settlement |
|---|---|---|
| 100 – 2499 (£1.00 – £24.99) | (0) SUCCESS | ACCEPTED |
| 2500 – 4999 (£25.00 – £49.99) | (0) SUCCESS | REJECTED |
| 5000 – 7499 (£50.00 – £74.99) | (1) CARD REFERRED | ACCEPTED |
| 10000 – 14999 (£100.00 – £149.99) | (5) CARD DECLINED | N/A |
| Any other amount | responseCode 66311 (Invalid Test Amount) | N/A |

For testing, use amounts in the **100–2499 range** (£1.00–£24.99) for successful end-to-end payments.

#### 4. Where to Test: Production vs Local

TakePayments needs to POST the server-to-server result back to your API at the `ServerResultURL`. This URL must be publicly reachable from the internet.

**Option A: Test on production (recommended for first test)**

The simplest approach. Your production API is already publicly accessible:

1. Enter **test** credentials (not live) in Settings → Payments on your production environment
2. Create a test job with a milestone in the £1–£24.99 range
3. Generate a payment link and complete the payment with a test card
4. Verify the milestone is marked as paid
5. When done, switch back to **live** credentials

This works because the test Merchant Account ID triggers the simulator regardless of where your API is hosted. No real money is charged.

**Option B: Test locally with ngrok**

If you want to test during development without touching production:

```bash
ngrok http 3000
```

Then set your `.env`:

```
API_BASE_URL=https://your-random-id.ngrok-free.app
APP_URL=http://localhost:5173
```

Restart the API server after changing `API_BASE_URL`.

> **Important**: The `API_BASE_URL` is used to build both `ServerResultURL` and `CallbackURL` that are sent to TakePayments with each payment request. If TakePayments can't reach these URLs, the server result won't be delivered and payments won't be recorded (although the card will still be charged).

### Test Scenarios

#### Scenario 1: Configure Payment Settings

1. Start the dev servers: `bun run dev`
2. Log in and navigate to **Settings → Payments**
3. Enter your **test** Merchant ID, Gateway Password, and Pre-Shared Key
4. Select the correct Hash Method (check your MMS account settings — usually SHA1)
5. Click **Save Settings**
6. Click **Test Connection** — should show "Configuration valid"

**What to verify:**
- Settings save without error
- "Connected" badge appears
- Test Connection passes (confirms credentials decrypt correctly)

#### Scenario 2: Payment via Payment Link (happy path)

1. Create a job with a payment schedule (at least one unpaid milestone)
2. On the job detail page → Payment Schedule tab, click **Payment Link** on an unpaid milestone
3. The link is copied to clipboard — open it in an incognito/different browser
4. The public payment page should show: tenant name, job reference, milestone description, amount
5. Click **Pay {amount}**
6. You'll be redirected to the TakePayments hosted form
7. Enter a test card number, expiry, and CSC
8. Submit the payment
9. You should be redirected to `/payment/success` showing the amount and card last 4

**What to verify:**
- Payment link opens correctly and shows the right details
- Redirect to TakePayments form works
- After payment, redirect to success page works
- In the database, check `payment_attempts` — status should be `success`, `hash_verified` should be `true`
- The `job_payment_schedule_items` row should have `paid_amount` set, `paid_at` populated, `payment_method` = `card`, and `card_last_four` populated
- On the job detail page, the milestone should now show as "Paid"

#### Scenario 3: Failed Payment

To trigger a decline, set the milestone amount to **£100.00–£149.99** (10000–14999 pence), which makes the simulator return a CARD DECLINED response.

1. Create a milestone with amount **£120.00**
2. Generate a payment link, open it, and click Pay
3. Enter a valid test card and submit
4. You should be redirected to `/payment/failure`

**What to verify:**
- Failure page shows an appropriate error message
- `payment_attempts` record has status `failed` with `status_code` = `5`
- The milestone remains unpaid

#### Scenario 4: Expired Payment Link

1. To test this without waiting 7 days, temporarily change `TOKEN_EXPIRY_DAYS` in `apps/api/src/lib/payment-token.ts` to `0`
2. Generate a payment link and try to open it

**What to verify:**
- The public payment page shows "Invalid or expired payment link"

#### Scenario 5: Already-Paid Milestone

1. Pay a milestone (or manually mark it as paid)
2. Try to generate a new payment link for it, or use an old link

**What to verify:**
- Generating a link returns an error: "Milestone is already paid"
- Opening an old link for a paid milestone shows "This payment has already been completed"

#### Scenario 6: Server Result Without Browser Redirect

This tests the resilience of the dual-path design.

1. Initiate a payment and complete it on the TakePayments form
2. Before the browser redirect completes, close the browser tab

**What to verify:**
- The `payment_attempts` record should still have `server_result_received_at` populated (server-to-server path succeeded)
- `callback_received_at` may be null (browser never completed redirect)
- The milestone should still be marked as paid — the server result is authoritative

#### Scenario 7: Mark as Manually Paid

1. On the job detail page, click **Mark Paid** on an unpaid milestone

**What to verify:**
- Milestone shows as paid with `payment_method` = `manual`
- No payment attempt records are created (manual payments bypass TakePayments)

### Debugging

#### Check Payment Attempt Records

Query the `payment_attempts` table to see all attempts for a milestone:

```sql
SELECT order_id, status, status_code, message, hash_verified,
       server_result_received_at, callback_received_at
FROM payment_attempts
WHERE milestone_id = 'your-milestone-id'
ORDER BY created_at DESC;
```

#### Check the Raw TakePayments Response

```sql
SELECT raw_response FROM payment_attempts WHERE order_id = 'your-order-id';
```

The `raw_response` column stores the full POST body from TakePayments' server result, which is useful for diagnosing hash verification failures or unexpected status codes.

#### Common Issues

| Symptom | Likely Cause |
|---|---|
| Payment succeeds on TakePayments but milestone stays unpaid | `API_BASE_URL` is unreachable from the internet — TakePayments can't POST the server result. If testing locally, check ngrok is running. If on prod, verify the API URL is correct and publicly accessible. |
| Hash verification fails (`hash_verified` = false, status = `error`) | Wrong Pre-Shared Key, wrong Hash Method (SHA1 vs HMACSHA1), or wrong Gateway Password. Double-check in MMS. |
| "TakePayments is not configured" error | Settings not saved for this tenant, or `is_active` is false. |
| Payment link shows "Invalid or expired" | Token has expired (7-day limit), or `PAYMENT_TOKEN_SECRET` env var changed between link generation and validation. |
| Amount mismatch error in `payment_attempts` | The amount returned by TakePayments doesn't match what was sent. This should not happen in normal operation — investigate for potential tampering. |
| Browser redirects to failure but `payment_attempts` shows success | The server result arrived and recorded success, but the callback redirect happened before the server result was processed. The milestone is actually paid — the failure page is misleading in this race condition. |

### Production Deployment Checklist

- [ ] `TAKEPAYMENTS_ENCRYPTION_KEY` set in production environment (SSM Parameter Store)
- [ ] `PAYMENT_TOKEN_SECRET` set in production environment
- [ ] `API_BASE_URL` set to the production API URL (must be publicly accessible)
- [ ] `APP_URL` set to the production frontend URL
- [ ] **Live** TakePayments credentials entered in Settings → Payments (not test credentials)
- [ ] Verify `ServerResultURL` is reachable from the internet (TakePayments must be able to POST to it)
- [ ] Test a small real payment end-to-end before going live with customers

---

## Reference Documentation

This integration was built against the **Hosted Form Integration Guide V1.2** (3rd Feb 2021). A copy is stored at `docs/hosted-form-integration-guide.pdf`.

TakePayments publishes two separate integration documents:

| Document | Version | Relevance to us |
|---|---|---|
| **Hosted Form Integration Guide** (V1.2) | Feb 2021 | **Primary spec** — defines the HashDigest, field orders, SERVER result delivery method, and all form variables used by our integration |
| **Gateway Integration Guide** (V3.02) | July 2022 | Reference only — covers Direct/Batch integration (different signing mechanism using SHA-512 + `signature` field). Appendix A-11 (test cards/amounts) and A-19 (hosted page options) are useful |

The Gateway Integration Guide V3.02 can be downloaded from: `https://mapi.takepayments.com/media/mtapfhfn/takepayments-gateway-integration-guide_v3-02_07-22.pdf`

Other useful links:
- **Developer Portal**: `https://developer.takepayments.com/`
- **MMS (Merchant Management System)**: `https://mms.tponlinepayments2.com`
- **Developer Support**: `https://www.takepayments.com/developer-support/`
- **Resources & Code Packs**: `https://www.takepayments.com/developer-support/resources/`
