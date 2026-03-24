# TASK-013: Create frontend hooks for brochure API

## Objective

Add TanStack Query hooks for all staff-facing brochure API operations, providing the data layer for the brochure list, detail, create, and edit pages.

## Why

The frontend pages (TASK-014 through TASK-016) need data fetching and mutation hooks. Creating them as a separate task allows the API integration layer to be validated independently before building the UI.

## Requirements

- Create `apps/web/src/hooks/use-brochures.ts` with the following hooks:

- **useBrochuresQuery({ page, limit, search, status })** — fetches `GET /api/brochures` with query params. Returns `{ brochures, pagination }`.

- **useBrochureQuery(id)** — fetches `GET /api/brochures/:id`. Returns brochure detail with products and customer info. Only enabled when `id` is truthy.

- **useCreateBrochureMutation()** — `POST /api/brochures`. On success, invalidates `['brochures']` query key.

- **useUpdateBrochureMutation()** — `PATCH /api/brochures/:id`. On success, invalidates `['brochures']` and `['brochure', id]` query keys.

- **useArchiveBrochureMutation()** — `DELETE /api/brochures/:id`. On success, invalidates `['brochures']` query key.

- **useSendBrochureMutation()** — `POST /api/brochures/:id/send`. On success, invalidates `['brochure', id]` query key. (The API endpoint is built in TASK-018; this hook can be defined now and will 404 until then — that's acceptable.)

## Constraints

- Follow the exact patterns in `apps/web/src/hooks/use-products.ts` for:
  - API base URL construction (`${API_URL}/brochures`)
  - Credentials: `{ credentials: 'include' }`
  - Error handling (throw on non-ok response)
  - Query key naming conventions
  - Mutation with `queryClient.invalidateQueries()`
- Do NOT create hooks for the public brochure endpoints — those will be inlined in the public page component following the `package-view.tsx` pattern

## Implementation Notes

Reference `apps/web/src/hooks/use-products.ts` for the hook structure. Key patterns:
- `const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'`
- `useQuery({ queryKey: ['brochures', params], queryFn: async () => { ... } })`
- `useMutation({ mutationFn: async (data) => { ... }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['brochures'] }) } })`
- Use `useQueryClient()` from `@tanstack/react-query` for invalidation

The list query should support query params:
```typescript
const params = new URLSearchParams();
if (page) params.set('page', String(page));
if (limit) params.set('limit', String(limit));
if (search) params.set('search', search);
if (status) params.set('status', status);
```

## Validation

1. Run `bun run build:web` — verify TypeScript compiles without errors
2. Start dev server (`bun run dev`), import `useBrochuresQuery` in a test render of an existing page, verify it fetches from `/api/brochures` without 404 (assuming TASK-011 is deployed)
3. Verify query key naming is consistent (check React Query devtools if available)

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
