# TASK-009: Frontend delete component action with confirmation dialog

## Objective

Add a delete action to each component row in the quote detail table, with a confirmation dialog before deletion.

## Why

FR2 requires each component row to have a delete action with a confirmation step. This completes the component CRUD on the quote detail page.

## Requirements

- Add `deleteComponent` fetch function and `useDeleteComponentMutation` hook in `use-quotes.ts`
- Add a delete button/icon to each component row in the components table
- Show `DeleteConfirmDialog` before executing the delete
- On confirm: call the DELETE endpoint, component disappears, totals recalculate
- Delete action only available when `canEditPricing` (draft status)
- Wire up in `quote-detail.tsx` and pass to the components section

## Implementation Notes

**Hook** — `apps/web/src/hooks/use-quotes.ts`:

```typescript
type DeleteComponentInput = {
    packageId: string;
    optionId: string;
    itemId: string;
};

async function deleteComponent({ packageId, optionId, itemId }: DeleteComponentInput): Promise<QuotePackageWithOptions> {
    const response = await fetch(`${API_URL}/api/quotes/${packageId}/options/${optionId}/components/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    // ... standard error handling
    const data: PackageResponse = await response.json();
    return data.package;
}
```

**UI** — In the components table (now in `components-section.tsx` from TASK-008), add an Actions column:

```tsx
{canEditPricing && <TableHead className="w-10"></TableHead>}
```

And in each row:
```tsx
{canEditPricing && (
    <TableCell>
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setDeletingId(comp.id)}
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    </TableCell>
)}
```

**Confirmation dialog** — Use `DeleteConfirmDialog` (imported from `@/components/admin/delete-confirm-dialog`) following the lettering section pattern:

```tsx
<DeleteConfirmDialog
    open={!!deletingId}
    onOpenChange={(open) => !open && setDeletingId(null)}
    onConfirm={async () => {
        if (!deletingId) return;
        await deleteComponentMutation.mutateAsync({
            packageId: pkg.id,
            optionId: option.id,
            itemId: deletingId,
        });
        setDeletingId(null);
    }}
    title="Delete Component"
    description="Are you sure you want to remove this component from the quote? This cannot be undone."
    isLoading={deleteComponentMutation.isPending}
/>
```

**State:** `const [deletingId, setDeletingId] = useState<string | null>(null);`

## Validation

1. `bun run build` compiles without errors
2. `bun run dev` — navigate to a draft `new_memorial` quote with components:
   - Verify delete icon appears on each component row
   - Click delete — verify confirmation dialog appears
   - Confirm delete — verify component disappears and totals update
   - Cancel delete — verify nothing changes
3. Verify delete button is hidden on non-draft quotes
4. Verify deleting the last component shows the empty state (or the add component button)

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
