# TASK-007: Frontend product pricing hook, toggle UI, and editable fields

## Objective

Add the frontend mutation hook for product-level pricing and build the XOR pricing mode toggle in the quote detail UI, allowing users to switch between component-level and product-level pricing.

## Why

FR4 requires a toggle/mode selector that switches between "Price by components" (existing behavior) and "Product price" (two editable fields). The mode is derived from the data — if `productRetailPrice` is non-null, mode is product pricing.

## Requirements

- Add `updateProductPricing` fetch function and `useUpdateProductPricingMutation` hook in `use-quotes.ts`
- Add pricing mode toggle to the components section in the quote detail UI
- In "Product price" mode: show two `EditableNumber` fields (Supplier Cost and Retail Price) instead of the components table
- In "Price by components" mode: show the existing components table (current behavior)
- Switching to "Product price": calls API with current values (or 0/0 for initial switch)
- Switching to "Price by components": calls API with `{ supplierCost: null, retailPrice: null }` to clear
- Toggle is only interactive when `canEditPricing` (draft status)
- Wire up the new mutation in `quote-detail.tsx` and pass to `OptionContent`

## Implementation Notes

**Hook** — `apps/web/src/hooks/use-quotes.ts`. Add near the existing pricing mutations (line ~866):

```typescript
type UpdateProductPricingInput = {
    packageId: string;
    optionId: string;
    supplierCost: number | null;
    retailPrice: number | null;
};

async function updateProductPricing({ packageId, optionId, ...input }: UpdateProductPricingInput): Promise<QuotePackageWithOptions> {
    const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}/product-pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    // ... error handling pattern from updateComponentPricing
    const data: PackageResponse = await response.json();
    return data.package;
}

export function useUpdateProductPricingMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProductPricing,
        onSuccess: (data) => {
            queryClient.setQueryData(['quote', data.id], data);
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
        },
    });
}
```

**OptionContent props** — `apps/web/src/components/quote/detail/option-content.tsx`. Add `updateProductPricing` prop (same typing pattern as other mutations).

**quote-detail.tsx** — Instantiate `useUpdateProductPricingMutation()` and pass to `OptionContent`.

**Toggle UI** — In `option-content.tsx`, in the components section (line ~91), add a toggle above the table:

```tsx
const isProductPricing = option.productRetailPrice !== null;

{sectionConfig.showComponents && (
    <>
        <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Stone Components</h4>
            {canEditPricing && (
                <div className="flex items-center gap-2">
                    {/* Toggle buttons or segmented control */}
                </div>
            )}
        </div>
        {isProductPricing ? (
            <div className="border rounded-lg p-6 space-y-4">
                {/* Product pricing: two EditableNumber fields */}
            </div>
        ) : (
            <>
                {/* Existing component table or empty state */}
            </>
        )}
    </>
)}
```

Use a simple button group or `Tabs` component for the toggle. Two buttons: "Price by components" and "Product price".

**EditableNumber fields** for product pricing mode:
- Supplier Cost: `value={parseFloat(option.productSupplierCost ?? '0')}`, `isCurrency`, `onSave` calls `updateProductPricing`
- Retail Price: `value={parseFloat(option.productRetailPrice ?? '0')}`, `isCurrency`, `onSave` calls `updateProductPricing`

## Validation

1. `bun run build` compiles without errors (both API types and web)
2. `bun run dev` — navigate to a draft `new_memorial` quote:
   - Verify the toggle appears near the components section
   - Click "Product price" — verify the component table is replaced by two editable fields
   - Enter supplier cost and retail price — verify quote totals update
   - Click "Price by components" — verify component table reappears and totals revert to component sum
3. Verify the toggle is disabled/hidden on non-draft quotes

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
