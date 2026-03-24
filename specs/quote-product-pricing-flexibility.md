# Quote Product Pricing Flexibility

## Background

The quote detail page currently requires stone components to be pre-configured on a product before a quote can be priced. When a product has no components, the user sees "No stone components added yet" with no way to add them or enter a price. Staff need more flexibility to price quotes when product data is incomplete.

## Goals

1. **Add/remove components from the quote detail page** — Users should be able to add and remove stone components directly on the quote, without navigating to the product page first.
2. **Product-level pricing on quotes** — Users should be able to enter a single supplier cost and retail price for the whole product on a quote, as an alternative to component-by-component pricing.
3. **XOR pricing mode** — A quote option uses either component-level pricing OR product-level pricing, never both.
4. **Sync new components back to product** — When a component type is added from the quote page, save the structural definition (type, quantity) back to the product's `productComponents` so future quotes benefit.

## Non-Goals

- Storing prices on product definitions — prices only exist in the context of a quote.
- Material/finish pricing lookups — component supplier costs remain manually entered per quote.
- Changes to the quote creation flow — this is about the quote detail (post-creation) page.
- Changes to lettering, sundries, or custom line items sections.

## Functional Requirements

### FR1: Add Components to a Quote Option

When viewing a quote option that shows components (quote types: `new_memorial`), the user can click an "Add Component" button. The add form collects:

- **Component type** (required) — dropdown from the 26 `COMPONENT_TYPES`
- **Material section** (required) — to filter the material dropdown
- **Material** (required) — stone colour/material
- **Finish** (optional) — surface treatment
- **Height, Width, Depth** (optional) — dimensions in inches
- **Quantity** (default 1)

On save:
- A new `quoteComponents` row is created with the selected values.
- `supplierCost` defaults to `0`, `markupPercent` from tenant pricing settings.
- `recalculateQuoteTotals()` is called.
- If the quote has a `productId`, and the product does not already have a `productComponent` with this `componentType`, create one on the product (type, quantity, sortOrder only — no pricing or material info).

The add form should follow the same inline pattern used by the lettering section's "+ Add Lettering" button — a form that expands inline rather than a dialog.

### FR2: Remove Components from a Quote Option

Each component row in the quote detail table should have a delete action. On delete:
- The `quoteComponents` row is removed.
- `recalculateQuoteTotals()` is called.
- The product definition is NOT modified (removing from a quote doesn't remove from the product).

A confirmation step (e.g. alert dialog) should be shown before deletion.

### FR3: Product-Level Pricing on a Quote Option

Add two new nullable fields to the `quotes` table:
- `productSupplierCost` — `numeric(10, 2)`, nullable
- `productRetailPrice` — `numeric(10, 2)`, nullable

When both are null, pricing works as today (sum of component line totals). When `productRetailPrice` is set, it replaces the component total in the subtotal calculation.

### FR4: XOR Pricing Mode Toggle

The quote detail page should present a toggle or mode selector near the product/components area:
- **"Price by components"** — shows the components table with per-row pricing (current behavior)
- **"Product price"** — shows two editable fields: supplier cost and retail price

Switching modes:
- Switching to "Product price" does NOT delete existing quote components — they are retained but excluded from pricing.
- Switching to "Price by components" clears `productSupplierCost` and `productRetailPrice` (sets to null).
- The toggle state is derived from the data: if `productRetailPrice` is non-null, mode is "Product price"; otherwise "Price by components".

### FR5: Pricing Calculation Updates

In `recalculateQuoteTotals()`:

```
if productRetailPrice is not null:
  productContribution = productRetailPrice
  productCost = productSupplierCost ?? 0
else:
  productContribution = sum of quoteComponents.lineTotal
  productCost = sum of quoteComponents.supplierCost * quantity

subtotal = productContribution + letteringTotal + sundryTotal + lineItemTotals
totalCost = productCost + letteringCost + sundryCost
```

VAT and total calculations remain unchanged.

### FR6: API Endpoint for Product Price

A new endpoint (or extension of existing update endpoint) to set/clear product-level pricing:

- `PUT /api/tenant/quotes/:quoteId/product-pricing` with body `{ supplierCost: number | null, retailPrice: number | null }`
- Sets the two fields on the quote and calls `recalculateQuoteTotals()`.
- Returns updated `QuotePackageWithOptions`.

## Technical Context

### Key Files

| Area | File |
|------|------|
| DB schema | `packages/shared/src/db/schema.ts` — `quotes` table (line ~942), `quoteComponents` (line ~1003), `productComponents` (line ~525) |
| Quote API | `apps/api/src/routes/quotes.ts` — `recalculateQuoteTotals()` (line ~183), component update endpoint (line ~1657) |
| Product components API | `apps/api/src/routes/product-components.ts` |
| Quote detail page | `apps/web/src/pages/customer/quote-detail.tsx` |
| Option content | `apps/web/src/components/quote/detail/option-content.tsx` — components section (line ~150), empty state (line ~168) |
| Lettering section (pattern) | `apps/web/src/components/quote/detail/lettering-section.tsx` — full CRUD inline pattern |
| Custom line items (pattern) | `apps/web/src/components/quote/detail/custom-line-items-section.tsx` |
| Quote hooks | `apps/web/src/hooks/use-quotes.ts` — mutations and query cache updates |
| Component types | `packages/shared/src/component-types.ts` or `apps/web/src/lib/product-utils.ts` |
| Material/finish data | `apps/web/src/hooks/use-materials.ts`, `apps/web/src/hooks/use-finishes.ts` |

### Existing Patterns to Follow

- **Add lettering flow** (`lettering-section.tsx`): Inline form toggled by button, POST to API, cache invalidation via returned `QuotePackageWithOptions`.
- **Delete lettering flow**: Confirmation dialog, DELETE to API, same cache pattern.
- **Component pricing edit** (`option-content.tsx`): Inline editable fields for supplier cost and markup percent on each row, PUT to API.
- **All quote mutations** return the full `QuotePackageWithOptions` and update the React Query cache for `['quote-package', packageId]`.

### Schema Migration

Two new nullable columns on `quotes` table. Generate migration with `bun run db:generate`, apply with `bun run db:migrate`.

## Constraints

- All prices are per-quote-option (each row in `quotes` is one option).
- No prices stored on product definitions — prices are quote-context only.
- Product component sync is structural only (type, quantity, sortOrder).
- The XOR is soft — components are retained in the DB when switching to product pricing, just excluded from calculation.
- Must work for all quote types that show the components section (currently only `new_memorial` per `QUOTE_TYPE_SECTION_CONFIG`).
