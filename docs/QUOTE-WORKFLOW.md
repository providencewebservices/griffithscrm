# Quote Workflow

This document describes how quotes move through their lifecycle. It is the authoritative reference for the quote state machine, side effects on state transitions, and the public customer-facing portal.

## Data Model

Quotes use a **package → options** structure:

- **`quote_packages`** — container that holds shared context (customer, memorial site, funeral director, status, customer response fields). One package = one customer-facing quote presentation.
- **`quotes`** — individual pricing options within a package (e.g. "Option A: Budget", "Option B: Premium"). Each has its own line items but shares the package's status.
- **Line item tables** — `quote_components` (stone pieces), `quote_lettering` (inscriptions), `quote_sundries` (add-ons), `quote_line_items` (freeform charges).

Status lives on **both** `quotePackages.status` and `quotes.status`. They are always kept in sync — when the package status changes, all child options are updated to match.

### Key Package Fields

| Field | Purpose |
|---|---|
| `status` | Current state (see below) |
| `accessToken` | 32-byte hex token for public portal URL |
| `accessTokenCreatedAt` | When current token was generated |
| `emailSentAt` | Last email send timestamp |
| `emailSentCount` | Total number of emails sent (supports resends) |
| `customerFeedback` | Free-text notes from customer |
| `customerFeedbackAt` | When customer last saved notes |
| `acceptedOptionId` | FK to the `quotes.id` the customer chose |
| `customerDecisionAt` | When customer accepted or rejected |
| `validUntil` | Expiry timestamp (nullable — no expiry if null) |

## States

```
draft → ready → presented → accepted
                           → rejected
                           → expired
```

Six states total. Three are terminal (`accepted`, `rejected`, `expired`).

| State | Meaning |
|---|---|
| `draft` | Being prepared. All pricing editable. |
| `ready` | Approved. Pricing locked. Ready to send to customer. |
| `presented` | Sent to / visible by customer. Awaiting their decision. |
| `accepted` | Customer accepted. Job created. Terminal. |
| `rejected` | Customer declined. Terminal. |
| `expired` | Validity period passed. Terminal. |

## Allowed Transitions

Defined in `apps/api/src/routes/quotes.ts` as `STATUS_TRANSITIONS`:

```typescript
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft:     ['ready', 'presented'],
  ready:     ['draft', 'presented'],
  presented: ['draft', 'accepted', 'rejected', 'expired'],
  accepted:  [],  // terminal
  rejected:  [],  // terminal
  expired:   [],  // terminal
};
```

Key behaviors:
- **Skip-ahead**: `draft` can jump directly to `presented`, bypassing `ready`.
- **Back-navigation**: `ready` and `presented` can return to `draft` for amendments.
- **Terminal lock**: Once `accepted`, `rejected`, or `expired`, no further transitions.
- **Terminal confirmation**: `rejected` and `expired` transitions require user confirmation via dialog in the UI.

The API endpoint `PATCH /api/quotes/packages/:id/status` enforces these transitions. It rejects any transition not in the map with a 400 error.

## UI: Primary CTA by State

| State | Primary CTA | Secondary Actions |
|---|---|---|
| `draft` | "Mark Ready" → advances to `ready` | Delete |
| `ready` (with email contact) | "Send to Customer" → opens send-email dialog | Mark as Presented |
| `ready` (no email contact) | "Mark as Presented" → advances to `presented` | — |
| `presented` | "Accept {option}" → creates job | Send Email (resend), Reject (with confirmation), Mark Expired (with confirmation) |
| `accepted` / `rejected` / `expired` | — (terminal) | — |

## Transition: Send Email (ready/presented → presented)

**Endpoint**: `POST /api/quotes/packages/:id/send-email`
**Auth**: Requires authenticated user with tenant.
**Allowed from**: `ready` or `presented` only (400 otherwise).

### Input

```typescript
{
  recipientEmail?: string;   // Optional override
  customMessage?: string;    // Inserted into email body
}
```

### Email Recipient Resolution (priority order)

1. Explicitly provided `recipientEmail`
2. Customer's primary email (from `contact_info` where `type='email'` and `isPrimary=true`)
3. Funeral director's primary email (same lookup pattern)
4. **Fails with 400** if none found

### Side Effects

1. **Generates new access token**: `crypto.randomBytes(32).toString('hex')` — replaces any previous token.
2. **Sends branded HTML email** containing:
   - Tenant logo (if exists)
   - Quote reference number(s)
   - Price display: single price if one option, range if multiple
   - Validity date (if set)
   - Custom message (if provided)
   - "View Your Quote" button → `{APP_URL}/quote/{accessToken}`
3. **Updates package metadata**:
   - `accessToken` = new token
   - `accessTokenCreatedAt` = now
   - `emailSentAt` = now
   - `emailSentCount` = previous + 1
4. **Auto-advances status**: If status was `ready`, moves to `presented`. If already `presented`, stays `presented`.
5. **Syncs child options**: All `quotes` in the package also move to `presented`.

### Important: Token Regeneration

Each email send generates a **new** access token, invalidating any previous link. This is by design — there is no token reuse.

## Acceptance Logic

Both the internal staff acceptance (`POST /api/quotes/packages/:id/accept/:optionId`) and public customer acceptance (`POST /api/public/quotes/view/:token/respond`) use the **same shared helper**: `createJobFromAcceptedQuote()` in `apps/api/src/lib/quote-acceptance.ts`.

This ensures identical behavior regardless of how the quote is accepted:

1. Package status → `accepted`, all options status → `accepted`
2. Records `acceptedOptionId`, `customerDecisionAt`, `customerFeedback` (if provided)
3. **Creates a Job** with `productionMethod` copied from the accepted option
4. **Creates payment schedule** (deposit + balance based on tenant settings)
5. **Seeds workflow tasks** from matching template (`quoteType` + `productionMethod`)

## Public Customer Portal

Three public endpoints (no auth required, accessed via access token):

### GET /api/public/quotes/view/:token

Returns customer-safe package data. Excludes `internalNotes`, supplier costs, and cost multipliers.

**Expiry check**: If `validUntil < now`, returns `410 Gone` with `{ expired: true }`.

**Line item filtering**: Only items where `visibleToCustomer = true` are returned. Items where `priceVisibleToCustomer = false` have their price set to `null` with `priceHidden: true`.

### POST /api/public/quotes/view/:token/respond

Customer submits their decision.

**Input**:
```typescript
{
  decision: 'accepted' | 'rejected';
  acceptedOptionId?: string;  // Required when decision = 'accepted'
  feedback?: string;
}
```

**Validation**:
- Package must be in `presented` status (400 otherwise)
- Cannot already have a decision (`acceptedOptionId` set or status is `accepted`/`rejected`)
- If `validUntil` has passed → 410
- If accepting, `acceptedOptionId` must reference a valid option in this package

**Side effects on acceptance**: See "Acceptance Logic" section above.

**Side effects on rejection**:

1. Package status → `rejected`
2. All options status → `rejected`
3. Records `customerDecisionAt`, `customerFeedback`
4. No job created.

### POST /api/public/quotes/view/:token/notes

Customer saves notes without committing to a decision.

**Input**: `{ notes: string }`
**Constraint**: Package must be in `presented` status.
**Effect**: Updates `customerFeedback` and `customerFeedbackAt`. Does not change status.

## What Does NOT Happen

These are explicitly absent from the current implementation:

- **No automatic expiry**: The system does not run a background job to mark quotes as `expired`. Expiry is enforced on-access (public portal returns 410) or set manually by staff.
- **No automated emails on acceptance/rejection**: The system does not notify staff when a customer responds. Only the explicit send-email endpoint generates emails.
- **No reminder emails**: No scheduled follow-ups for presented quotes.
- **No PDF generation**: Quotes are viewed via the web portal, not as downloadable PDFs.

## File Locations

| Concern | File |
|---|---|
| Schema (all quote tables) | `packages/shared/src/db/schema.ts` |
| Status transitions + internal API | `apps/api/src/routes/quotes.ts` (`STATUS_TRANSITIONS`) |
| Shared acceptance logic | `apps/api/src/lib/quote-acceptance.ts` |
| Send-email handler | `apps/api/src/routes/quotes.ts` (send-email endpoint) |
| Public portal API | `apps/api/src/routes/public-quotes.ts` |
| Job number generation | `apps/api/src/routes/jobs.ts` (`generateJobNumber`) |
| Email sending utility | `apps/api/src/lib/email.ts` |
| Quote detail page (UI) | `apps/web/src/pages/customer/quote-detail.tsx` |
| Quote hooks (status helpers) | `apps/web/src/hooks/use-quotes.ts` |
