# TASK-006: Add component deletion API endpoint

## Objective

Create an API endpoint to remove a stone component from a quote option.

## Why

FR2 requires users to delete components from the quote detail page. The endpoint removes the `quoteComponent` row and recalculates totals. Product definitions are NOT modified on deletion.

## Requirements

- New endpoint: `DELETE /:id/options/:optionId/components/:itemId`
- Validate package (exists, tenant, draft status) and option (belongs to package)
- Verify the component exists and belongs to the option
- Delete the `quoteComponent` row
- Call `recalculateQuoteTotals()` for the option
- Return `{ package: QuotePackageWithOptions }` via `getPackageWithOptions()`
- Do NOT modify the product definition

## Implementation Notes

**File:** `apps/api/src/routes/quotes.ts`

Follow the `deleteLettering` endpoint pattern at line 3215:
```typescript
.delete('/:id/options/:optionId/components/:itemId', async (c) => {
    const currentUser = c.get('user');
    const tenantId = currentUser.tenantId!;
    const packageId = c.req.param('id');
    const optionId = c.req.param('optionId');
    const itemId = c.req.param('itemId');

    // 1. Validate package (exists, tenant, draft)
    // 2. Validate option belongs to package
    // 3. Validate component exists and belongs to option
    // 4. Delete quoteComponent row
    // 5. recalculateQuoteTotals(optionId)
    // 6. Return getPackageWithOptions(packageId, tenantId)
})
```

The delete should use:
```typescript
await db.delete(quoteComponents).where(eq(quoteComponents.id, itemId));
```

## Validation

1. `bun run build:api` compiles without errors
2. `bun run dev` — use curl to DELETE a component from a draft quote option:
   - Verify the component is removed from the returned package data
   - Verify totals are recalculated (subtotal decreased)
3. Verify attempting to delete from a non-draft quote returns 400
4. Verify attempting to delete a non-existent component returns 404

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
