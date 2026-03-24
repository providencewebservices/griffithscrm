# TASK-018: Build brochure email template and send API endpoint

## Objective

Add the `POST /api/brochures/:id/send` endpoint that generates a branded HTML email and sends it to the customer via the existing email infrastructure.

## Why

Phase 2 of the brochure spec adds email delivery. Staff need to send (or resend) the brochure link to customers via a professional, branded email.

## Requirements

- Add endpoint to `apps/api/src/routes/brochures.ts`:

  - **POST /:id/send** — Send brochure email to customer
    - Look up brochure by ID, verify tenant ownership
    - Look up customer's primary email via `customerContactInfo` + `contactInfo` join (where `type = 'email'`). Return 400 if no email found with message "Customer has no email address on file."
    - Look up tenant name and logo status
    - Construct the public brochure URL: `${process.env.APP_URL || 'http://localhost:5173'}/brochure/${accessToken}`
    - Generate branded HTML email:
      - Tenant logo (if available, as an `<img>` tag using the logo proxy URL)
      - Tenant business name
      - Subject: "Your Memorial Selection from [Tenant Name]"
      - Body: staff message (if provided), followed by a prominent "View Your Brochure" CTA button linking to the public page
      - Clean, professional HTML with inline styles (email-safe)
      - Plain text fallback
    - Send via `sendEmail()` from `apps/api/src/lib/email.ts`
    - Update brochure: set `emailSentAt` to now, increment `emailSentCount`
    - Return success with `{ emailSentAt, emailSentCount }`

## Constraints

- Follow the email sending pattern from `apps/api/src/routes/quotes.ts` (search for `sendEmail` usage, around line 2008+)
- Email HTML must use inline styles (no external CSS — many email clients strip `<style>` tags)
- The logo in the email should use an absolute URL (e.g., `${APP_URL}/api/logo/${tenantId}`)
- Keep the email template simple and professional — this is a memorial mason business

## Implementation Notes

For the customer email lookup, follow the pattern from the quote send-email section in `quotes.ts`:
```typescript
const customerEmails = await db
  .select({ value: contactInfo.value })
  .from(customerContactInfo)
  .innerJoin(contactInfo, eq(customerContactInfo.contactInfoId, contactInfo.id))
  .where(
    and(
      eq(customerContactInfo.customerId, brochure.customerId),
      eq(contactInfo.type, 'email')
    )
  )
  .limit(1);
```

For the email HTML, use a simple template with inline styles:
```html
<div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif;">
  <!-- Logo -->
  <!-- Greeting -->
  <!-- Staff message -->
  <!-- CTA button -->
  <a href="${brochureUrl}" style="display: inline-block; padding: 14px 28px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 4px;">
    View Your Brochure
  </a>
  <!-- Footer with tenant name -->
</div>
```

For the `APP_URL` env var, reference how the quote route constructs URLs: `const baseUrl = process.env.APP_URL || 'http://localhost:5173'`.

## Validation

1. Start dev server: `bun run dev` (ensure Mailpit is running for local email)
2. Create a brochure for a customer who has an email address
3. Call `POST /api/brochures/:id/send` — verify 200 response with emailSentAt and emailSentCount
4. Check Mailpit (`http://localhost:8025`) — verify email received with:
   - Correct subject line
   - Tenant branding
   - Staff message (if set)
   - "View Your Brochure" button with correct link
5. Click the link in the email — verify it opens the public brochure page
6. Call send again — verify emailSentCount increments
7. Test with a customer who has no email — verify 400 response

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
