# TASK-005: Add component creation API endpoint with product sync

## Objective

Create an API endpoint to add a new stone component to a quote option directly from the quote detail page, and sync the component type back to the product definition.

## Why

FR1 requires users to add components from the quote page without navigating to the product page. This endpoint creates the `quoteComponent` row and optionally syncs the structural definition back to the product's `productComponents` table.

## Requirements

- New endpoint: `POST /:id/options/:optionId/components`
- Request body: `{ componentType, materialId?, finishId?, height?, width?, depth?, quantity? }`
- Validate package (exists, tenant, draft status) and option (belongs to package)
- Look up material by ID to snapshot `materialName`; look up finish by ID to snapshot `finishName`
- Create `quoteComponent` row with:
  - `supplierCost` = `'0'`
  - `markupPercent` from tenant's `defaultMarkupPercent` in `tenantPricingSettings`
  - Calculate `unitPrice` and `lineTotal` from supplierCost + markupPercent
  - `sortOrder` = max existing sortOrder + 1 for this quote option
- Call `recalculateQuoteTotals()` for the option
- **Product sync** (FR1): if the option has a `productId`, and the product does NOT already have a `productComponent` with this `componentType`, insert a new `productComponent` with `componentType`, `quantity`, and `sortOrder` (next available)
- Return `{ package: QuotePackageWithOptions }` via `getPackageWithOptions()`

## Implementation Notes

**File:** `apps/api/src/routes/quotes.ts`

**Zod schema** — add near line 473:
```typescript
const addComponentSchema = z.object({
    componentType: z.enum(COMPONENT_TYPES as unknown as [string, ...string[]]),
    materialId: z.string().optional().nullable(),
    finishId: z.string().optional().nullable(),
    height: z.number().min(0).optional().nullable(),
    width: z.number().min(0).optional().nullable(),
    depth: z.number().min(0).optional().nullable(),
    quantity: z.number().int().min(1).optional().default(1),
});
```

**Material/finish snapshot** — look up material name and finish name by ID, similar to how the lettering endpoint looks up technique and color names. Use:
```typescript
const [material] = materialId ? await db.select().from(materials).where(eq(materials.id, materialId)).limit(1) : [null];
const [finish] = finishId ? await db.select().from(finishes).where(eq(finishes.id, finishId)).limit(1) : [null];
```

**Tenant pricing settings** — fetch `defaultMarkupPercent`:
```typescript
const [settings] = await db.select().from(tenantPricingSettings)
    .where(eq(tenantPricingSettings.tenantId, tenantId)).limit(1);
const markupPercent = settings?.defaultMarkupPercent ?? '100';
```

**Product sync** — check if product already has a component of this type:
```typescript
if (option.productId) {
    const existing = await db.select().from(productComponents)
        .where(and(
            eq(productComponents.productId, option.productId),
            eq(productComponents.componentType, data.componentType)
        )).limit(1);
    if (existing.length === 0) {
        // Insert new productComponent (type, quantity, sortOrder only)
    }
}
```

**Imports needed:** `materials`, `finishes`, `tenantPricingSettings`, `productComponents` from schema. Also `nanoid` or whatever ID generator the codebase uses (check existing `insert` calls).

## Validation

1. `bun run build:api` compiles without errors
2. `bun run dev` — use curl to POST a new component to a draft quote option:
   - Verify the component appears in the returned package data
   - Verify `materialName` and `finishName` are snapshotted
   - Verify `markupPercent` matches tenant default
   - Verify totals are recalculated
3. For a quote with a `productId`, verify a `productComponent` row is created if the type didn't exist
4. For a quote with a `productId`, verify NO duplicate `productComponent` is created if the type already exists

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
