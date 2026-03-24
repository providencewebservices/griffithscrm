# TASK-020: Add "Create Brochure" shortcut to customer detail page

## Objective

Add a "Create Brochure" action to the customer detail page so staff can quickly create a brochure for a specific customer without navigating away to search for them.

## Why

The spec explicitly states brochures should be accessible "from the customer detail page." This shortcut streamlines the workflow when staff are already viewing a customer's record.

## Requirements

- Add a "Create Brochure" button or link to the customer detail page at `apps/web/src/pages/customer/customer-detail.tsx`
- The button links to `/app/brochures/new?customerId={customer.id}`
- Place it in the header actions area alongside existing buttons (e.g., Edit, Archive)
- Use the `BookOpen` icon from lucide-react (matching the sidebar nav icon for Brochures)

## Constraints

- Do not duplicate functionality — this is just a navigation shortcut, not a form
- Keep the customer detail page clean — one button/link, not a full brochure section
- If the customer has an active brochure, optionally show a "View Brochure" link instead of or alongside "Create Brochure" (this is a nice-to-have, not required)

## Implementation Notes

Reference the existing action buttons in `customer-detail.tsx`. The button should follow the same style and placement:

```tsx
<Link to={`/app/brochures/new?customerId=${customer.id}`}>
  <Button variant="outline" size="sm">
    <BookOpen className="h-4 w-4 mr-2" />
    Create Brochure
  </Button>
</Link>
```

The `customerId` query param is already handled by TASK-015 (the create page reads it to pre-select the customer).

## Validation

1. Start dev server: `bun run dev`
2. Navigate to a customer detail page
3. Verify "Create Brochure" button appears in the actions area
4. Click it — verify it navigates to `/app/brochures/new?customerId={id}`
5. Verify the customer is pre-selected in the brochure creation form
6. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
