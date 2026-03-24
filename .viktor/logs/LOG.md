# Viktor Task Log

### TASK-001: Add productSupplierCost and productRetailPrice columns to quotes table
- **Timestamp:** 2026-03-24T12:00:00Z
- **Outcome:** done
- **Summary:** Added `productSupplierCost` and `productRetailPrice` nullable numeric columns to the `quotes` schema table and the frontend `QuoteOption` type. Generated migration `0042_wonderful_hairball.sql`.
- **Validation:** `bun run db:generate` produced correct ALTER TABLE SQL. `db:migrate` skipped (no local DB). `bun run build:api` and `bun run build:web` both pass with no TypeScript errors.

### TASK-002: Update recalculateQuoteTotals to support product-level pricing
- **Timestamp:** 2026-03-24T14:30:00Z
- **Outcome:** done
- **Summary:** Updated `recalculateQuoteTotals()` in `apps/api/src/routes/quotes.ts` to implement XOR pricing logic. When `productRetailPrice` is non-null, it replaces the component line total sum for subtotal calculation and `productSupplierCost` replaces the component cost sum. Existing component-level pricing is unchanged when product pricing is null.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-003: Migrate component/sundry pricing PUT endpoints to package-based route pattern
- **Timestamp:** 2026-03-24T16:00:00Z
- **Outcome:** done
- **Summary:** Migrated component PUT from `/:quoteId/components/:itemId` to `/:id/options/:optionId/components/:itemId` and sundry PUT from `/:quoteId/sundries/:itemId` to `/:id/options/:optionId/sundries/:itemId`. Both handlers now validate package existence, draft status, and option membership before updating. Return response uses `getPackageWithOptions()` wrapped as `{ package: ... }` matching the lettering endpoint pattern.
- **Validation:** `bun run build:api` compiles successfully. Old routes confirmed removed. New routes verified at correct paths.

### TASK-004: Add product pricing API endpoint (PUT product-pricing)
- **Timestamp:** 2026-03-24T17:00:00Z
- **Outcome:** done
- **Summary:** Added `updateProductPricingSchema` Zod schema and `PUT /:id/options/:optionId/product-pricing` endpoint. Validates package ownership, draft status, and option membership. Sets `productSupplierCost` and `productRetailPrice` on the quote option row (converting numbers to strings, or null to clear). Calls `recalculateQuoteTotals()` and returns the full package via `getPackageWithOptions()`.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-005: Add component creation API endpoint with product sync
- **Timestamp:** 2026-03-24T18:00:00Z
- **Outcome:** done
- **Summary:** Added `addComponentSchema` Zod schema and `POST /:id/options/:optionId/components` endpoint. Validates package ownership, draft status, and option membership. Looks up material/finish by ID for name snapshots. Uses tenant default markup with supplierCost=0. Inserts quoteComponent with calculated pricing and next sortOrder. Product sync: if the option has a productId and the product lacks a component of this type, inserts a new productComponent. Recalculates totals and returns full package.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-006: Add component deletion API endpoint
- **Timestamp:** 2026-03-24T19:00:00Z
- **Outcome:** done
- **Summary:** Added `DELETE /:id/options/:optionId/components/:itemId` endpoint following the deleteLettering pattern. Validates package ownership, draft status, option membership, and component existence. Deletes the quoteComponent row, recalculates totals, and returns the updated package. Does not modify product definitions.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-007: Frontend product pricing hook, XOR toggle UI, and editable fields
- **Timestamp:** 2026-03-24T20:00:00Z
- **Outcome:** done
- **Summary:** Added `updateProductPricing` fetch function and `useUpdateProductPricingMutation` hook in `use-quotes.ts`. Built XOR pricing mode toggle (segmented button group) in the components section of `option-content.tsx`. In "Product price" mode, the component table is replaced by two EditableNumber fields (Supplier Cost and Retail Price). Switching modes calls the product-pricing API endpoint. Toggle is only interactive on draft quotes. Wired up the mutation in `quote-detail.tsx`.
- **Validation:** `bun run build:api` and `bun run build:web` both compile successfully with no errors.

### TASK-008: Frontend add component inline form with mutation hook
- **Timestamp:** 2026-03-24T21:00:00Z
- **Outcome:** done
- **Summary:** Added `addComponent` fetch function and `useAddComponentMutation` hook in `use-quotes.ts`. Extracted the components section from `option-content.tsx` into a new `components-section.tsx` file following the `lettering-section.tsx` pattern. Added inline "Add Component" form with dropdowns for component type, material section (with cascading material filter), material, finish, dimension inputs (labels change per component type), and quantity. Form only shows in "Price by components" mode on draft quotes. Wired up mutation in `quote-detail.tsx`.
- **Validation:** `bun run build:web` compiles successfully with no errors.

### TASK-009: Frontend delete component action with confirmation dialog
- **Timestamp:** 2026-03-24T22:00:00Z
- **Outcome:** done
- **Summary:** Added `deleteComponent` fetch function and `useDeleteComponentMutation` hook in `use-quotes.ts`. Added a trash icon button to each component row in `components-section.tsx` (visible only on draft quotes). Clicking opens a `DeleteConfirmDialog` confirmation before executing the DELETE endpoint. On confirm, the component disappears and totals recalculate. Threaded the mutation through `option-content.tsx` and `quote-detail.tsx`.
- **Validation:** `bun run build:web` compiles successfully with no errors.

### TASK-010: Add brochures and brochure_products tables to database schema
- **Timestamp:** 2026-03-24T23:00:00Z
- **Outcome:** done
- **Summary:** Added `brochures` and `brochureProducts` table definitions to `schema.ts` with all required columns, FK constraints (cascade delete on tenantId/brochureId, set null on customerId/createdById/productId), unique accessToken, and a partial unique index `brochures_active_per_customer` enforcing one active brochure per customer per tenant. Generated migration `0043_perfect_peter_parker.sql` and applied it successfully.
- **Validation:** `bun run db:generate` produced correct migration SQL. `bun run db:migrate` applied successfully. Migration SQL verified: both tables created with correct columns, FKs, and unique partial index.

### TASK-011: Create authenticated brochure API routes (staff CRUD)
- **Timestamp:** 2026-03-24T23:30:00Z
- **Outcome:** done
- **Summary:** Created `apps/api/src/routes/brochures.ts` with five endpoints: POST (create with auto-archive of existing active brochure, access token generation, brochure_products insertion), GET list (paginated with customer name join, product count subquery, status filtering for active/expired/archived/all, search by customer name), GET detail (with products join, customer email lookup from contactInfo), PATCH (update message/expiresAt, replace products array), DELETE (soft archive). Mounted at `/api/brochures` in `index.ts`.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-012: Create public brochure API routes (no auth, token-based)
- **Timestamp:** 2026-03-24T23:45:00Z
- **Outcome:** done
- **Summary:** Created `apps/api/src/routes/public-brochures.ts` with three endpoints: GET /:token (returns brochure data with products, tenant branding, no pricing/cost data, filters out deleted products, 410 for expired/archived), POST /:token/interest/:productId (toggles isInterested on brochure_products with timestamp management), POST /:token/ready (idempotently sets readyToDiscussAt). Mounted at `/api/public/brochures` in `index.ts` alongside other public routes. No authentication required — token-based access only.
- **Validation:** `bun run build:api` compiles successfully with no errors.

### TASK-013: Create frontend hooks for brochure API
- **Timestamp:** 2026-03-24T24:00:00Z
- **Outcome:** done
- **Summary:** Created `apps/web/src/hooks/use-brochures.ts` with TanStack Query hooks for all staff-facing brochure API operations. Includes `useBrochuresQuery` (paginated list with search/status), `useBrochureQuery` (detail by ID), `useCreateBrochureMutation`, `useUpdateBrochureMutation`, `useArchiveBrochureMutation`, and `useSendBrochureMutation`. All follow existing patterns from `use-products.ts` with proper query key invalidation.
- **Validation:** `bun run build:web` compiles successfully with no TypeScript errors.

### TASK-014: Build brochure list page with routing and navigation
- **Timestamp:** 2026-03-24T14:00:00Z
- **Outcome:** done
- **Summary:** Created `apps/web/src/pages/customer/brochures.tsx` with search (debounced), status filter (All/Active/Expired/Archived), paginated table (customer name, product count, status badge, ready to discuss, created date, View button), and pagination controls. Added `/app/brochures` route in `App.tsx` and "Brochures" sidebar nav item with BookOpen icon in `nav-items.ts`.
- **Validation:** `bun run build:web` compiles successfully with no TypeScript errors.

### TASK-015: Build brochure create page with product selector
- **Timestamp:** 2026-03-24T15:00:00Z
- **Outcome:** done
- **Summary:** Created `apps/web/src/pages/customer/brochure-new.tsx` with customer selector (Command/Combobox with search, pre-selection via `customerId` query param), product search with debounced input and image thumbnails, selected products list with up/down reorder and remove buttons, message textarea, date picker defaulting to 30 days, and save button using `useCreateBrochureMutation()` with redirect to detail page. Added `/app/brochures/new` route in `App.tsx`.
- **Validation:** `bun run build:web` compiles successfully with no TypeScript errors.

### TASK-016: Build brochure detail page (staff view with edit actions)
- **Timestamp:** 2026-03-24T18:00:00Z
- **Outcome:** done
- **Summary:** Created `apps/web/src/pages/customer/brochure-detail.tsx` with header (customer name linked to customer detail, status badge, dates, created-by name), message section with inline edit dialog, products list with signed image URLs and interest indicators (filled heart with tooltip timestamp), ready-to-discuss prominent card, and sidebar with details. Actions include edit message, edit products (reusing product selector pattern with search/add/remove/reorder), change expiry, and archive with confirmation dialog. Updated API to join `users` table for `createdByName` and `productCategories` table for `productCategoryName`. Added route `/app/brochures/:id` in App.tsx. Archived brochures display read-only (no edit actions).
- **Validation:** `bun run build:api` and `bun run build:web` both pass with no TypeScript errors.

### TASK-017: Build public brochure page (customer-facing)
- **Timestamp:** 2026-03-24T19:30:00Z
- **Outcome:** done
- **Summary:** Created `apps/web/src/pages/public/brochure-view.tsx` with tenant branding header (logo via proxy + business name), staff message display, responsive product grid (auto-fill minmax 280px) with image cards and no pricing data, heart toggle with optimistic UI (cancel + rollback on error), sticky "I'm Ready to Discuss" button (disabled after click, persisted state on reload), expired/error/loading skeleton states. Modified `apps/api/src/routes/public-brochures.ts` to return pre-signed S3 image URLs so the public page can display product images without authentication. Added route `/brochure/:token` in `App.tsx`.
- **Validation:** `bun run build:api` and `bun run build:web` both pass with no TypeScript errors.

### TASK-018: Build brochure email template and send API endpoint
- **Timestamp:** 2026-03-24T20:00:00Z
- **Outcome:** done
- **Summary:** Added `POST /:id/send` endpoint to `apps/api/src/routes/brochures.ts`. Looks up brochure with tenant verification, fetches customer email via `customerContactInfo`/`contactInfo` join (returns 400 if none found), retrieves tenant name and logo for branding, builds a professional HTML email with inline styles (Georgia serif font, tenant logo, staff message, "View Your Brochure" CTA button) plus plain text fallback, sends via `sendEmail()`, then updates `emailSentAt` and increments `emailSentCount`.
- **Validation:** `bun run build:api` passes, `bunx biome check` passes with no errors.
