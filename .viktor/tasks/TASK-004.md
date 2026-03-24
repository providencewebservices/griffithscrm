# TASK-004: Add product pricing API endpoint

## Objective

Create an API endpoint to set or clear product-level pricing on a quote option, enabling the XOR pricing mode.

## Why

FR6 specifies an endpoint to toggle between component-level and product-level pricing. Setting `productRetailPrice` activates product-level pricing; clearing it (setting to null) reverts to component-level pricing.

## Requirements

- New endpoint: `PUT /:id/options/:optionId/product-pricing`
- Request body schema: `{ supplierCost: number | null, retailPrice: number | null }`
- Validate package exists, belongs to tenant, and is in `draft` status
- Validate option exists and belongs to the package
- Set `productSupplierCost` and `productRetailPrice` on the quote (option row in `quotes` table)
- Call `recalculateQuoteTotals()` for the option
- Return `{ package: QuotePackageWithOptions }` via `getPackageWithOptions()`

## Implementation Notes

**File:** `apps/api/src/routes/quotes.ts`

**Zod schema** — add near line 473 (after `updateLineItemPricingSchema`):
```typescript
const updateProductPricingSchema = z.object({
    supplierCost: z.number().min(0).nullable(),
    retailPrice: z.number().min(0).nullable(),
});
```

**Endpoint** — add near the other `options/:optionId` routes (after line ~3215). Follow the lettering PUT validation pattern:
1. Extract `id` (packageId) and `optionId` from params
2. Validate package (exists, tenant, draft status)
3. Validate option belongs to package
4. Update quote row: set `productSupplierCost` and `productRetailPrice` (convert numbers to strings, or null)
5. Call `recalculateQuoteTotals(optionId)`
6. Return via `getPackageWithOptions(id, tenantId)`

**String conversion** — numeric columns store strings. Convert: `supplierCost !== null ? String(supplierCost) : null`.

## Validation

1. `bun run build:api` compiles without errors
2. `bun run dev` — use curl or the API to test:
   - `PUT /api/quotes/{pkgId}/options/{optId}/product-pricing` with `{ "supplierCost": 200, "retailPrice": 500 }` → verify quote's subtotal changes
   - Same endpoint with `{ "supplierCost": null, "retailPrice": null }` → verify subtotal reverts to component sum

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
