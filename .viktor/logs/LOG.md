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
