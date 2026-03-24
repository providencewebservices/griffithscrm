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
