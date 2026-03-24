# TASK-002: Update recalculateQuoteTotals to support product-level pricing

## Objective

Modify the quote totals recalculation logic so that when `productRetailPrice` is set on a quote option, it replaces the component total in the subtotal and cost calculations.

## Why

FR5 defines the XOR pricing logic: if `productRetailPrice` is non-null, use it as the product contribution to the subtotal instead of summing individual component line totals. This logic must be in place before the product pricing API endpoint can function correctly.

## Requirements

- Expand the select query to fetch `productRetailPrice` and `productSupplierCost` alongside `vatRate`
- When `productRetailPrice` is not null:
  - `componentTotal` = `parseFloat(productRetailPrice)`
  - `componentCost` = `parseFloat(productSupplierCost ?? '0')`
- When `productRetailPrice` is null: existing behavior (sum of component lineTotals / supplierCosts)
- All other calculations (lettering, sundries, line items, VAT) remain unchanged

## Implementation Notes

**File:** `apps/api/src/routes/quotes.ts`, `recalculateQuoteTotals()` function (line 183).

Current select at line 193 fetches only `vatRate`:
```typescript
const [quote] = await db
    .select({ vatRate: quotes.vatRate })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
```

Expand to:
```typescript
const [quote] = await db
    .select({
        vatRate: quotes.vatRate,
        productRetailPrice: quotes.productRetailPrice,
        productSupplierCost: quotes.productSupplierCost,
    })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
```

Then replace the `componentTotal` and `componentCost` calculations (lines 202, 217):
```typescript
const componentTotal = quote.productRetailPrice !== null
    ? parseFloat(quote.productRetailPrice)
    : components.reduce((sum, c) => sum + parseFloat(c.lineTotal), 0);

const componentCost = quote.productRetailPrice !== null
    ? parseFloat(quote.productSupplierCost ?? '0')
    : components.reduce((sum, c) => sum + parseFloat(c.supplierCost) * c.quantity, 0);
```

Note: components are still fetched even in product-pricing mode (they're retained in the DB, just excluded from calculation).

## Validation

1. `bun run build:api` compiles without errors
2. Existing component-level pricing behavior is unchanged when `productRetailPrice` is null (verify by reading existing quote totals before/after)
3. Manual test: use a SQL client to set `product_retail_price = '500.00'` and `product_supplier_cost = '200.00'` on a draft quote with components, then trigger recalculation via any existing mutation — verify subtotal uses 500.00 instead of component sum

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
