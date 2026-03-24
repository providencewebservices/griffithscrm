# TASK-001: Add productSupplierCost and productRetailPrice columns to quotes table

## Objective

Add two nullable numeric columns to the `quotes` table to support product-level pricing as an alternative to component-by-component pricing.

## Why

FR3 requires that a quote option can store a single supplier cost and retail price for the whole product. These columns must exist before any backend logic or API endpoints can use them.

## Requirements

- Add `productSupplierCost` column: `numeric('product_supplier_cost', { precision: 10, scale: 2 })`, nullable
- Add `productRetailPrice` column: `numeric('product_retail_price', { precision: 10, scale: 2 })`, nullable
- Update the `QuoteOption` type in the frontend to include the new fields
- Generate and apply the migration

## Implementation Notes

**Schema** — `packages/shared/src/db/schema.ts`, `quotes` table (line ~942). Add the two columns after the existing pricing fields (`totalCost`, `vatRate`). Follow the nullable numeric pattern — omit `.notNull()` and `.default()` so they default to SQL NULL.

Example from the same table:
```typescript
subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
```
New columns should look like:
```typescript
productSupplierCost: numeric('product_supplier_cost', { precision: 10, scale: 2 }),
productRetailPrice: numeric('product_retail_price', { precision: 10, scale: 2 }),
```

**Frontend type** — `apps/web/src/hooks/use-quotes.ts`, `QuoteOption` type (line ~124). Add:
```typescript
productSupplierCost: string | null;
productRetailPrice: string | null;
```

**Migration** — Run `bun run db:generate` to create the migration file in `packages/shared/drizzle/`, then `bun run db:migrate` to apply it.

## Validation

1. `bun run db:generate` completes without errors and produces a new SQL migration file
2. `bun run db:migrate` applies the migration successfully
3. Verify the migration SQL contains two `ALTER TABLE "quotes" ADD COLUMN` statements
4. `bun run build` compiles without TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
