# TASK-016: Build brochure detail page (staff)

## Objective

Create the staff-facing brochure detail page showing brochure status, products with customer interest indicators, and edit/archive actions.

## Why

Staff need to see which products a customer is interested in, whether they've signalled readiness to discuss, and to edit the brochure. This is the primary management view for an individual brochure.

## Requirements

- Create `apps/web/src/pages/customer/brochure-detail.tsx` with:

  - **Header section**:
    - Customer name (linked to customer detail page)
    - Status badge (Active / Expired / Archived)
    - Created date and expiry date
    - Created by (staff user name)

  - **Message section**: Display the staff message. Editable via an edit button → inline textarea or dialog.

  - **Products section**:
    - List/grid of products in the brochure
    - Each product shows: name, image, category, description
    - Interest indicator: filled heart/star icon if `isInterested` is true, with `interestedAt` timestamp tooltip
    - Products ordered by `sortOrder`
    - Edit button to add/remove products (opens a dialog or inline editor, reusing the product selector pattern from TASK-015)

  - **Ready to Discuss section**:
    - If `readyToDiscussAt` is set: prominent indicator showing "Customer is ready to discuss" with timestamp
    - If not set: "Customer has not indicated readiness yet"

  - **Actions**:
    - Edit message (inline or dialog)
    - Edit products (add/remove)
    - Change expiry
    - Archive with confirmation dialog (uses `useArchiveBrochureMutation`)

  - Uses `useBrochureQuery(id)` and `useUpdateBrochureMutation()`

- Add route in `apps/web/src/App.tsx`:
  - `<Route path="brochures/:id" element={<BrochureDetailPage />} />` inside the `/app` parent route

## Constraints

- Follow the CLAUDE.md detail page patterns: edit and delete/archive actions on the detail page, not on the list
- The "Copy Link" and "Send Email" actions are handled in TASK-019 — do not add them here
- Product images should use `useSignedUrl` for S3 signed URLs
- Archived brochures should display as read-only (no edit actions)

## Implementation Notes

Reference `apps/web/src/pages/customer/product-detail.tsx` for the detail page layout pattern:
- `useParams<{ id: string }>()` to get the brochure ID
- Loading and error states
- Header with title and action buttons
- Sections for related data (products, status)

For the interest indicators, use lucide-react icons: `Heart` (outline) and `HeartIcon` (filled) or similar. Show the `interestedAt` timestamp in a tooltip using shadcn `Tooltip`.

For the archive confirmation, use a pattern like `DeleteConfirmDialog` from existing detail pages. The archive action sets `archivedAt` (soft delete).

For editing products, consider a dialog that reuses the product selector pattern from TASK-015 (search products, add/remove). On save, call `useUpdateBrochureMutation` with the new products array.

## Validation

1. Start dev server: `bun run dev`
2. Navigate to `/app/brochures/:id` — page renders with brochure info
3. Verify customer name, status badge, dates display correctly
4. Verify message section shows the staff message
5. Verify products list with interest indicators (if customer has interacted)
6. Verify ready-to-discuss status displays
7. Edit the message — verify it saves
8. Add/remove a product — verify it saves
9. Archive the brochure — verify confirmation dialog and archived state
10. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
