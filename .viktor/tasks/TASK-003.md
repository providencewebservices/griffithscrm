# TASK-003: Migrate component pricing PUT endpoint to package-based route pattern

## Objective

Move the existing component pricing update endpoint from `/:quoteId/components/:itemId` to `/:id/options/:optionId/components/:itemId` to match the lettering endpoint pattern and the frontend's expected URL.

## Why

The current route at line 1657 (`/:quoteId/components/:itemId`) does not match what the frontend sends (`/${packageId}/options/${optionId}/components/${itemId}`). The lettering endpoints (line 3001, 3215) already use the `/:id/options/:optionId/` prefix. This migration is a prerequisite for the add/delete component endpoints (TASK-005, TASK-006) which will also use this pattern, and ensures existing component pricing editing works correctly.

## Requirements

- Move the PUT handler from `/:quoteId/components/:itemId` to `/:id/options/:optionId/components/:itemId`
- Update the handler to:
  - Extract `id` (packageId) and `optionId` from params instead of `quoteId`
  - Validate the package exists and belongs to the tenant
  - Check package status is `draft` (not quote status)
  - Verify the option belongs to the package
  - Verify the component belongs to the option
- Return response via `getPackageWithOptions()` wrapped as `{ package: ... }` (same pattern as lettering PUT at line 3001)
- Remove the old `/:quoteId/components/:itemId` route

## Constraints

- The frontend mutation in `use-quotes.ts` (`updateComponentPricing` at line 790) already uses the correct URL pattern — do NOT change the frontend
- Follow the exact same validation pattern as the lettering PUT endpoint at line 3001

## Implementation Notes

**File:** `apps/api/src/routes/quotes.ts`

**Reference pattern** — lettering PUT at line 3001:
```typescript
.put('/:id/options/:optionId/lettering/:itemId', zValidator('json', ...), async (c) => {
    // 1. Get packageId, optionId, itemId from params
    // 2. Validate package exists + tenant + draft status
    // 3. Validate option belongs to package
    // 4. Validate item belongs to option
    // 5. Update item
    // 6. Recalculate totals
    // 7. Return getPackageWithOptions(packageId, tenantId)
})
```

The existing handler at line 1657 has the correct update logic (calculate unitPrice, lineTotal from supplierCost + markupPercent). Keep that business logic, just wrap it in the package-based validation pattern.

Also migrate the sundry pricing PUT endpoint at line ~1789 (`/:quoteId/sundries/:itemId`) to `/:id/options/:optionId/sundries/:itemId` using the same pattern, since the frontend (`updateSundryPricing` at use-quotes.ts line 840) also uses the package-based URL.

## Validation

1. `bun run build:api` compiles without errors
2. `bun run dev` — navigate to a draft quote with components, edit a component's supplier cost via the inline field — verify the price updates and totals recalculate
3. Verify the old route (`/:quoteId/components/:itemId`) no longer exists in the source

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
