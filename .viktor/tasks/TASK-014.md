# TASK-014: Build brochure list page with routing and navigation

## Objective

Create the staff-facing brochure list page with search, filtering, pagination, and integrate it into the app routing and sidebar navigation.

## Why

Staff need a central place to view and manage all brochures. The list page is the entry point for the brochure workflow and must be discoverable via the sidebar.

## Requirements

- Create `apps/web/src/pages/customer/brochures.tsx` with:
  - Page header: "Brochures" title with a "New Brochure" button (links to `/app/brochures/new`)
  - Search input (debounced, searches by customer name)
  - Status filter tabs/select: All, Active, Expired, Archived
  - Table with columns:
    - Customer name
    - Products (count)
    - Status (badge: Active / Expired / Archived)
    - Ready to Discuss (yes/no or timestamp)
    - Created date
    - Actions: "View" button linking to `/app/brochures/:id`
  - Pagination (page/limit, ChevronLeft/ChevronRight buttons)
  - Use `useBrochuresQuery` hook from TASK-013

- Add route in `apps/web/src/App.tsx`:
  - `<Route path="brochures" element={<BrochuresPage />} />` inside the `/app` parent route

- Add sidebar nav item in `apps/web/src/lib/nav-items.ts`:
  - Add `{ title: "Brochures", url: "/app/brochures", icon: BookOpen }` after the "Quotes" entry
  - Import `BookOpen` from `lucide-react`

## Constraints

- Follow the CLAUDE.md UI patterns: "View" button in actions column, no dropdown with edit/delete
- Follow the list page pattern from `apps/web/src/pages/customer/quotes.tsx` (search, filters, pagination)
- Status logic: Active = not archived and not expired; Expired = expiresAt < now and not archived; Archived = archivedAt is set

## Implementation Notes

Reference `apps/web/src/pages/customer/quotes.tsx` for:
- Debounced search with `useState` + `useEffect` + `setTimeout` (300ms)
- Page reset on filter change
- Pagination with `page` and `limit` state
- Table layout using shadcn `Table`, `TableHeader`, `TableRow`, `TableCell`
- Status badge using shadcn `Badge` component

For the status badge colors, use the same variant pattern as quote statuses (e.g., `default` for active, `secondary` for expired, `outline` for archived).

For the "New Brochure" button, use `<Link to="/app/brochures/new"><Button>New Brochure</Button></Link>`.

## Validation

1. Start dev server: `bun run dev`
2. Navigate to `/app/brochures` — page renders with header, search, and table
3. Verify "Brochures" appears in the sidebar navigation
4. If brochures exist, verify they display correctly with customer name and status
5. Verify search filters by customer name
6. Verify status filter works (Active/Expired/Archived/All)
7. Verify "View" button links to `/app/brochures/:id`
8. Verify "New Brochure" button links to `/app/brochures/new`
9. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
