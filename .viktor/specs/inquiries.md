# Inquiries

Capture customer interest before a formal quote. Inquiries are the top of the sales funnel — they record who got in touch, what they're interested in, and provide a launching point for creating brochures and quotes.

## Problem / Motivation

Currently there's no way to capture early-stage customer interest. When someone contacts the business (via website, phone, or walk-in), staff either create a full customer record immediately or risk losing the lead. There's no lightweight way to track who inquired, what they were interested in, and whether they were followed up on.

The brochure and quote features exist but have no formal "entry point." Staff need a place to receive and triage incoming interest, then smoothly transition into the brochure → quote workflow when appropriate.

## Goals

- Provide a lightweight way to capture incoming customer interest before committing to a full customer record
- Allow website forms to submit inquiries directly via a public API endpoint
- Allow staff to manually create inquiries (phone, walk-in, email)
- Track which products a prospect is interested in (optional)
- Make it easy to create a customer record from an inquiry (pre-filling details) or associate an inquiry with an existing customer
- Make it easy to create a brochure or quote directly from an inquiry, carrying context forward
- Track what each inquiry led to (customer, brochures, quotes)
- Surface new inquiries on the dashboard so nothing falls through the cracks

## User-Facing Behavior

### Staff: Inquiry List Page (`/app/inquiries`)

- Table showing all inquiries with columns: name, email, status, source, product interest (count or names), date, associated customer (if any)
- Filter by status (new, contacted, converted, closed)
- Search by name or email
- Pagination
- "Add Inquiry" button in header → navigates to new inquiry page

### Staff: New Inquiry Page (`/app/inquiries/new`)

- Form with fields: first name, last name, email, phone, message/notes, source (website, phone, walk-in, email, referral), product interest (multi-select from products table, optional)
- Save creates the inquiry with status `new`

### Staff: Inquiry Detail Page (`/app/inquiries/:id`)

- Header: name, status badge, source, date created
- Contact details: email, phone
- Message/notes section (editable)
- Product interest: list of products they expressed interest in (with links to product detail pages)
- **Customer association section:**
  - If no customer linked: "Create Customer" button (pre-fills name, email, phone from inquiry) and "Link to Existing Customer" search/select
  - If customer linked: shows customer name with link to customer detail page, option to unlink
- **Conversion actions (prominent in header or action bar):**
  - "Create Brochure" → navigates to brochure creation with customer (if linked) and interested products pre-selected
  - "Create Quote" → navigates to quote creation with customer (if linked) pre-selected
- **Activity/history section:**
  - Shows linked brochures and quotes that originated from this inquiry, with status badges and links
- Status controls: staff can change status (new → contacted → converted / closed)
- Edit and archive actions

### Staff: Customer Detail Page

- New "Inquiries" section showing any inquiries linked to this customer, with status and date

### Staff: Dashboard

- New widget or section showing recent/new inquiries (count of `new` status inquiries, list of latest few)

### Website: Public Submission

- External API endpoint accepts inquiry data from a tenant's website
- Returns a success response (no auth required, tenant resolved by URL slug)
- Submitted inquiries appear in the staff inquiry list with source `website`

## Technical Requirements

### Database Schema

**`inquiries` table:**
- `id` — uuid, primary key
- `tenantId` — uuid, FK to tenants, not null
- `customerId` — uuid, FK to customers, nullable (linked after association)
- `firstName` — text, not null
- `lastName` — text, not null
- `email` — text, nullable
- `phone` — text, nullable
- `message` — text, nullable
- `source` — text, not null (enum: `website`, `phone`, `walk_in`, `email`, `referral`)
- `status` — text, not null, default `new` (enum: `new`, `contacted`, `converted`, `closed`)
- `createdAt` — timestamp, default now
- `updatedAt` — timestamp, default now
- `archivedAt` — timestamp, nullable (soft delete)

**`inquiryProducts` table:**
- `id` — uuid, primary key
- `inquiryId` — uuid, FK to inquiries, not null, cascade delete
- `productId` — uuid, FK to products, not null
- `createdAt` — timestamp, default now

### API Endpoints

**Authenticated (staff):**
- `POST /api/inquiries` — Create inquiry with optional products array
- `GET /api/inquiries` — List with pagination, search, status filter
- `GET /api/inquiries/:id` — Detail with products, linked customer, linked brochures/quotes
- `PATCH /api/inquiries/:id` — Update fields, status, products
- `DELETE /api/inquiries/:id` — Archive (soft delete via archivedAt)
- `POST /api/inquiries/:id/link-customer` — Associate with existing customer by customerId
- `POST /api/inquiries/:id/unlink-customer` — Remove customer association

**External (public, no auth):**
- `POST /api/external/:slug/inquiries` — Submit inquiry from website (tenant resolved by slug)

### Linking Inquiries to Brochures and Quotes

Add an optional `inquiryId` foreign key to the `brochures` and `quotePackages` tables. When a brochure or quote is created from an inquiry detail page, this ID is passed through so the relationship is tracked. The inquiry detail page queries brochures and quote packages by this foreign key to show conversion history.

### Dashboard

Add to the existing `/api/dashboard/stats` response:
- `inquiries.newCount` — count of inquiries with status `new`
- `inquiries.recent` — latest 5 inquiries (id, name, source, status, createdAt)

## Constraints

- All authenticated queries must be tenant-scoped (same pattern as all other routes)
- External endpoint must use the existing slug-based tenant resolution pattern from `external-products.ts`
- Follow existing soft-delete pattern (archivedAt) — no hard deletes
- Follow existing pagination pattern (page, limit, total, totalPages)
- Product interest references the tenant's own `products` table only
- The inquiry → brochure / inquiry → quote flow should pre-fill but not enforce — staff can modify anything before saving the brochure or quote

## Non-Goals

- No public-facing inquiry status tracking (customers don't get a portal to check their inquiry)
- No automated email responses to website submissions (staff will follow up manually)
- No enforced workflow — inquiries don't have to become brochures or quotes
- No file/image uploads on inquiries
- No duplicate detection (matching by email or phone to existing inquiries/customers)
- No assignment of inquiries to specific staff members
- No SLA tracking or response-time metrics
- No integration with external CRM or marketing tools

## Phasing

### Phase 1: Core Inquiry Management
- Database schema (inquiries + inquiryProducts)
- Authenticated API (CRUD, customer linking)
- Inquiry list page, new inquiry page, detail page
- Customer detail page: show linked inquiries

### Phase 2: Conversion Flow
- Add `inquiryId` FK to brochures and quotePackages
- "Create Brochure" and "Create Quote" actions on inquiry detail page with pre-fill
- Activity/history section on inquiry detail showing linked brochures and quotes
- Status auto-update to `converted` when a brochure or quote is created from the inquiry

### Phase 3: External API & Dashboard
- External submission endpoint (`POST /api/external/:slug/inquiries`)
- Dashboard widget showing new inquiry count and recent inquiries
