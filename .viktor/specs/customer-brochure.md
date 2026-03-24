# Customer Brochure

A pre-quote feature that lets staff curate a selection of products into a branded "brochure" for a customer to browse via a unique link. Customers can indicate interest in specific products and signal when they're ready to discuss, giving staff a clear starting point for the formal quote process.

## Problem / Motivation

Today, the first interaction with a customer jumps straight to a formal quote. There's no lightweight way for staff to present product options for a customer to browse at their own pace before committing to the quoting process. Staff often need to show families what's available — especially when a customer is early in the decision-making process and isn't ready for pricing or specifics yet. A brochure fills this gap: it's a low-pressure, visually appealing way to share curated product selections.

## Goals

- Staff can create a brochure for a customer by selecting products from the existing product catalog
- Staff can include a freeform message/note on the brochure (e.g., recommendations, context)
- The brochure is sent to the customer via email as a branded, shareable link
- Staff can also copy the unique link to send through other channels
- Customers can browse the brochure without logging in (public, token-based access)
- Customers can mark interest on individual products (soft toggle, not a commitment)
- Customers can signal "ready to discuss" when they've finished browsing
- Staff can view which products a customer expressed interest in and whether they've signalled readiness
- Staff can edit an existing brochure (add/remove products, update the message)
- Creating a new brochure for a customer replaces the previous one (only one active brochure per customer)
- Brochures expire after a configurable period, with a sensible default

## User-Facing Behavior

### Staff Flow (Admin UI)

1. **Create Brochure**: Staff navigates to a "New Brochure" action (accessible from the customer detail page or a dedicated brochures section). They select a customer (or create one inline if they don't exist yet).
2. **Select Products**: Staff browses/searches the product catalog and adds products to the brochure. Products are shown with their name, image, and category.
3. **Add Message**: Staff writes an optional freeform message that appears at the top of the brochure (e.g., "Hi Mrs. Jones, here are some options we think would suit the plot at St Mary's").
4. **Set Expiry**: A default expiry of 30 days is pre-filled. Staff can adjust this.
5. **Send / Share**: Staff can send the brochure via email and/or copy the unique link. Sending via email delivers a branded email with a "View Your Brochure" call-to-action linking to the public page.
6. **Edit Brochure**: Staff can return to an existing brochure to add/remove products, update the message, or resend the link.
7. **View Interest**: On the brochure detail page, staff can see which products the customer has toggled as "interested" and whether the customer has clicked "Ready to Discuss". A timestamp is shown for the "ready to discuss" signal.

### Customer Flow (Public Page)

1. **Open Link**: Customer clicks the link from their email (or pasted link). No login required.
2. **Branded Page**: The page shows the tenant's logo and business name at the top, followed by the staff's message (if provided).
3. **Browse Products**: Products are displayed as visual cards in a grid/list layout. Each card shows the product image, name, description, and category. No pricing is shown.
4. **Mark Interest**: Each product card has a toggle (heart or star icon) that the customer can click to indicate interest. This is a soft, reversible action — they can toggle it on and off.
5. **Ready to Discuss**: A prominent "I'm Ready to Discuss" button is available (e.g., fixed at the bottom or in a sticky header). Clicking it records a timestamp and shows a confirmation message (e.g., "Thanks! Your memorial mason will be in touch soon.").
6. **Expired Brochure**: If the brochure has expired, the page shows a friendly message asking the customer to contact the business directly.

## Technical Requirements

### Data Model

- **`brochures` table**: `id`, `tenantId`, `customerId`, `createdById` (staff user), `message` (text, nullable), `accessToken` (unique, for public URL), `expiresAt` (timestamp), `readyToDiscussAt` (timestamp, nullable — set when customer clicks the button), `archivedAt` (timestamp, nullable), `createdAt`, `updatedAt`
- **`brochure_products` table**: `id`, `brochureId`, `productId`, `sortOrder` (integer), `isInterested` (boolean, default false), `interestedAt` (timestamp, nullable), `createdAt`
- Unique constraint: one active (non-archived) brochure per customer per tenant. When a new brochure is created for a customer, the previous active brochure is archived (set `archivedAt`).
- `accessToken` is a cryptographically random string (same pattern as `quotePackages.accessToken`).

### API Endpoints

**Authenticated (staff):**
- `POST /api/brochures` — Create a new brochure (archives any existing active brochure for that customer)
- `GET /api/brochures` — List brochures for the tenant (with customer name, product count, status)
- `GET /api/brochures/:id` — Get brochure detail (includes products with interest state, ready-to-discuss status)
- `PATCH /api/brochures/:id` — Update brochure (message, expiry, products)
- `DELETE /api/brochures/:id` — Archive a brochure
- `POST /api/brochures/:id/send` — Send (or resend) the brochure email to the customer

**Public (no auth, token-based):**
- `GET /api/public/brochures/:token` — Get brochure data for the public view (products, message, tenant branding)
- `POST /api/public/brochures/:token/interest/:productId` — Toggle interest on a product
- `POST /api/public/brochures/:token/ready` — Mark "ready to discuss"

### Email

- Use the existing `sendEmail` utility (SES in production, SMTP/Mailpit in development)
- Email should be HTML with tenant branding (logo, business name)
- Subject line: e.g., "Your Memorial Selection from [Tenant Name]"
- Body includes the staff message (if provided) and a prominent "View Your Brochure" button linking to the public page

### Public Page

- Served from the existing React app under `/public/brochure/:token` (same pattern as `/public/package-view`)
- Tenant-branded: logo, business name pulled from the brochure API response
- Responsive design — must work well on mobile since customers will likely open the email on their phone
- No pricing shown on any product

## Constraints

- Products shown in the brochure are a snapshot reference to the `products` table — if a product is later archived or edited, the brochure should still work (show the product as it exists, or handle gracefully if deleted)
- The brochure is independent of the quote system — no foreign keys between brochures and quotes
- Multi-tenant: all queries must be scoped to `tenantId`
- Access tokens must be cryptographically secure and unguessable (use `crypto.randomBytes`)
- The public page must not expose any pricing, cost, or margin data

## Non-Goals

- **Notifications to staff**: No in-app or email notifications when a customer interacts with the brochure. Staff check the brochure detail page manually. This is future work.
- **Analytics/tracking**: No tracking of page views, time spent, or browsing patterns.
- **Customer accounts**: Customers do not need to log in or create an account to view the brochure.
- **Product customization**: Customers cannot configure product options (dimensions, colors, etc.) from the brochure. That happens during the quote process.
- **Pricing**: No prices are shown on the brochure. This is a browsing/inspiration tool, not a price list.
- **Quote generation from brochure**: There is no automated "convert brochure to quote" flow. The brochure and quote are independent.
- **Multiple active brochures per customer**: Only one active brochure per customer at a time. Creating a new one archives the old.
- **PDF export**: No PDF version of the brochure.

## Phasing

### Phase 1: Core Brochure CRUD + Public Page
- Data model and migrations
- Staff CRUD API endpoints
- Staff UI: create, edit, list, detail views
- Public page: browse products, mark interest, ready to discuss
- Public API endpoints

### Phase 2: Email Delivery
- Branded HTML email template
- Send/resend endpoint
- Copy-link functionality in staff UI
