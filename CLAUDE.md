# Griffiths CRM - Development Guidelines

## UI Patterns

### List/Table Views

Tables showing entities should follow this pattern:

- **View Button**: Use a simple "View" button in the actions column, not a dropdown menu with ellipsis
- **No Edit/Delete on Lists**: Edit and delete actions belong on the detail page only
- **Add Button**: List pages can have an "Add" button in the header for creating new items
- **Navigation Focus**: List views are for browsing and navigating to detail pages

```tsx
// Good - Simple View button
<TableCell>
  <Link to={`/app/categories/${item.id}`}>
    <Button variant="ghost" size="sm">View</Button>
  </Link>
</TableCell>

// Bad - Dropdown with multiple actions
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <MoreHorizontal />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>View</DropdownMenuItem>
      <DropdownMenuItem>Edit</DropdownMenuItem>
      <DropdownMenuItem>Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

### Detail Pages

Detail pages handle all CRUD operations for a single entity:

- **Edit**: Button in header or inline editing
- **Delete/Archive**: In actions dropdown or dedicated button
- **Related Data**: Show and manage related entities (e.g., products in a category)
