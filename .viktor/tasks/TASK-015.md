# TASK-015: Build brochure create page (staff)

## Objective

Create the staff-facing form for creating a new brochure — selecting a customer, choosing products, writing a message, and setting an expiry.

## Why

Staff need to curate product selections for customers. This page is the primary action for creating brochures and must support efficient product browsing and selection.

## Requirements

- Create `apps/web/src/pages/customer/brochure-new.tsx` with:

  - **Customer selector**: Searchable dropdown/combobox to select an existing customer. If a `customerId` query param is present in the URL (from the customer detail page shortcut), pre-select that customer.

  - **Product selector**:
    - Search/browse products from the product catalog
    - Show product name, image (signed URL), and category
    - Add button on each product to add it to the brochure
    - Selected products shown as a reorderable list (drag or up/down buttons for sort order)
    - Remove button on each selected product

  - **Message**: Textarea for optional freeform message

  - **Expiry**: Date picker defaulting to 30 days from now. Staff can adjust.

  - **Save button**: Calls `useCreateBrochureMutation()`, on success redirects to `/app/brochures/:id` (the detail page)

- Add route in `apps/web/src/App.tsx`:
  - `<Route path="brochures/new" element={<BrochureNewPage />} />` inside the `/app` parent route (before the `:id` route)

## Constraints

- Inline customer creation (spec mentions "create one inline if they don't exist yet") is out of scope for this task — will be addressed separately if needed
- Product list should only show active, non-archived products
- Product search should use the existing products API (`GET /api/tenant/products?search=...&isActive=true`)
- Do not show pricing on products — only name, image, category, description

## Implementation Notes

For the customer selector, use a shadcn `Combobox` or `Command` component with async search. Fetch customers via `GET /api/customers?search=...`. Reference how the quote creation page (`apps/web/src/pages/customer/quote-new.tsx`) handles customer selection.

For the product selector, fetch via `GET /api/tenant/products?search=...&isActive=true&limit=20`. Display results in a list/grid with an "Add" button. Already-selected products should be visually distinguished or hidden from search results.

For product images, use the `useSignedUrl` hook from `apps/web/src/hooks/use-uploads.ts` to convert S3 keys to signed URLs.

For reordering selected products, a simple approach is up/down arrow buttons (avoid complex drag-and-drop libraries). Track `sortOrder` as the array index.

For reading the `customerId` query param: `const [searchParams] = useSearchParams(); const preselectedCustomerId = searchParams.get('customerId');`

## Validation

1. Start dev server: `bun run dev`
2. Navigate to `/app/brochures/new` — form renders with all sections
3. Search and select a customer
4. Search and add 2-3 products — verify they appear in the selected list
5. Reorder products — verify sort order changes
6. Remove a product — verify it's removed
7. Write a message, adjust expiry
8. Click Save — verify brochure is created and redirects to detail page
9. Navigate to `/app/brochures/new?customerId=...` — verify customer is pre-selected
10. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
