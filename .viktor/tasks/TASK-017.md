# TASK-017: Build public brochure page (customer-facing)

## Objective

Create the customer-facing public brochure page where customers can browse products, mark interest, and signal readiness to discuss — all without logging in.

## Why

This is the customer-facing half of the brochure feature. Customers receive a link via email or other channels and need to browse a branded, mobile-friendly product selection at their own pace.

## Requirements

- Create `apps/web/src/pages/public/brochure-view.tsx` with:

  - **Tenant branding header**: Logo (if available) and business name at the top
  - **Staff message**: Display the freeform message below the header (if provided)
  - **Product grid**: Responsive grid/list of product cards. Each card shows:
    - Product image (full-width at top of card)
    - Product name
    - Product description (truncated if long)
    - Category name
    - **No pricing** — no prices, costs, or margin data anywhere
  - **Interest toggle**: Each product card has a heart/star icon button. Clicking toggles interest on/off via `POST /api/public/brochures/:token/interest/:productId`. Optimistic UI update.
  - **"I'm Ready to Discuss" button**: Prominent button (fixed at bottom or sticky). Clicking calls `POST /api/public/brochures/:token/ready`. On success, shows confirmation: "Thanks! Your memorial mason will be in touch soon." Button becomes disabled after clicking.
  - **Expired state**: If the API returns 410, show a friendly message: "This brochure has expired. Please contact [tenant name] directly." with the tenant's phone/email if available.
  - **Loading state**: Skeleton cards while fetching

- Add route in `apps/web/src/App.tsx`:
  - `<Route path="/brochure/:token" element={<PublicBrochureViewPage />} />` in the public routes section (alongside `/quote/:token`)

## Constraints

- No authentication — no session cookies, no credentials in API calls
- Must work well on mobile (responsive, touch-friendly toggle targets)
- No pricing data exposed anywhere
- Product images: the public page needs to display product images. Check how the existing public quote page (`package-view.tsx`) handles images — it may use a proxy route or unsigned URLs. Follow the same approach.
- Interest toggles should be optimistic (update UI immediately, revert on error)

## Implementation Notes

**API calls**: Inline the TanStack Query hooks directly in the component, following the pattern in `apps/web/src/pages/public/package-view.tsx`:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['public-brochure', token],
  queryFn: async () => {
    const res = await fetch(`${API_URL}/api/public/brochures/${token}`);
    if (res.status === 410) throw new Error('expired');
    if (!res.ok) throw new Error('not-found');
    return res.json();
  },
});
```

Note: public API calls should NOT include `credentials: 'include'` since there's no session.

**Interest toggle mutation**: Use `useMutation` with optimistic updates:
```typescript
const toggleInterest = useMutation({
  mutationFn: async (productId: string) => {
    const res = await fetch(`${API_URL}/api/public/brochures/${token}/interest/${productId}`, { method: 'POST' });
    return res.json();
  },
  onMutate: async (productId) => {
    // Optimistic update
    queryClient.setQueryData(['public-brochure', token], (old) => ({
      ...old,
      products: old.products.map(p =>
        p.productId === productId ? { ...p, isInterested: !p.isInterested } : p
      ),
    }));
  },
});
```

**Ready to discuss**: After clicking, the button text changes to "Thanks! Your memorial mason will be in touch soon." and stays disabled. If `readyToDiscussAt` is already set in the initial data, show the confirmation state immediately.

**Responsive layout**: Use a CSS grid with `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` for the product cards. Cards stack vertically on mobile.

**Tenant logo**: If `hasLogo` is true in the API response, display the logo via the `/api/logo/:tenantId` proxy route (check how `package-view.tsx` handles this).

## Validation

1. Start dev server: `bun run dev`
2. Create a brochure with products via the staff API
3. Open `/brochure/{accessToken}` in the browser — page renders with tenant branding and products
4. Verify no pricing is shown anywhere
5. Click the interest toggle on a product — verify it toggles visually and persists on refresh
6. Click "I'm Ready to Discuss" — verify confirmation message shows
7. Refresh — verify the button stays in confirmed state
8. Test with an expired brochure — verify the expired message displays
9. Test on mobile viewport (Chrome DevTools responsive mode) — verify layout works
10. Run `bun run build:web` — no TypeScript errors

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
