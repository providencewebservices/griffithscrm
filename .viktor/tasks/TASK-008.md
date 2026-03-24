# TASK-008: Frontend add component inline form with mutation hook

## Objective

Build the "Add Component" button and inline form on the quote detail page, wired to the new POST endpoint, allowing users to add stone components directly from the quote.

## Why

FR1 requires adding components without navigating to the product page. This is the primary user-facing feature — previously the empty state showed "No stone components added yet" with no action.

## Requirements

- Add `addComponent` fetch function and `useAddComponentMutation` hook in `use-quotes.ts`
- Add "Add Component" button to the components section (visible when `canEditPricing` and in "Price by components" mode)
- Inline form collects: component type, material section, material, finish, height, width, depth, quantity
- Form follows the lettering-section.tsx inline pattern: expands below the button, has Cancel and Add buttons
- On save: calls the POST endpoint, resets form, hides form
- Wire up in `quote-detail.tsx` and `option-content.tsx`

## Constraints

- Form only appears in "Price by components" mode (not when product pricing is active)
- Component type dropdown uses `COMPONENT_TYPES` with `COMPONENT_TYPE_LABELS` for display
- Material dropdown is filtered by selected material section
- Finish dropdown shows all active finishes (not filtered by material)

## Implementation Notes

**Hook** — `apps/web/src/hooks/use-quotes.ts`:

```typescript
type AddComponentInput = {
    packageId: string;
    optionId: string;
    componentType: string;
    materialId?: string | null;
    finishId?: string | null;
    height?: number | null;
    width?: number | null;
    depth?: number | null;
    quantity?: number;
};

async function addComponent({ packageId, optionId, ...input }: AddComponentInput): Promise<QuotePackageWithOptions> {
    const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    // ... standard error handling
    const data: PackageResponse = await response.json();
    return data.package;
}
```

**UI — Consider extracting to `components-section.tsx`** — The lettering section is its own file (`lettering-section.tsx`, ~479 lines) because the CRUD complexity warrants it. The components section with add/delete will have similar complexity. Extract the components rendering from `option-content.tsx` (lines 90-173) into a new `apps/web/src/components/quote/detail/components-section.tsx` file following the same pattern as `lettering-section.tsx`.

**Inline form** — Follow `lettering-section.tsx` pattern (line ~166):
- `const [showAddForm, setShowAddForm] = useState(false)`
- Button: `<Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}><Plus /> Add Component</Button>`
- Form in a `<div className="border rounded-lg p-4 mb-4 bg-muted/50">` with grid layout

**Form fields:**
- Component Type: `<Select>` with `COMPONENT_TYPES` mapped to `COMPONENT_TYPE_LABELS` (from `apps/web/src/lib/product-utils.ts`)
- Material Section: `<Select>` using `useMaterialSectionsQuery()` from `apps/web/src/hooks/use-material-sections.ts`
- Material: `<Select>` using `useMaterialsQuery()` filtered by selected `sectionId`
- Finish: `<Select>` using `useFinishesQuery()` from `apps/web/src/hooks/use-finishes.ts`
- Height, Width, Depth: `<Input type="number">` — use dimension labels from `getDimensionLabels()` in `product-utils.ts`
- Quantity: `<Input type="number" min={1} defaultValue={1}>`

**Grid layout:** `grid grid-cols-1 md:grid-cols-3 gap-4` for the main dropdowns, then a second row for dimensions.

**quote-detail.tsx** — Instantiate `useAddComponentMutation()` and pass to `OptionContent` (or to the new `ComponentsSection`).

## Validation

1. `bun run build` compiles without errors
2. `bun run dev` — navigate to a draft `new_memorial` quote:
   - Click "Add Component" button — verify inline form appears
   - Select component type, material section, material — verify cascading dropdown works
   - Fill in dimensions and click Add — verify component appears in the table
   - Verify totals are recalculated
3. Verify "Add Component" button is hidden on non-draft quotes
4. Verify "Add Component" button is hidden when in product pricing mode
5. Verify the form Cancel button hides the form without saving

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
