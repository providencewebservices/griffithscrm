# TASK-012: Create public brochure API routes (no auth, token-based)

## Objective

Build the public-facing API endpoints that allow customers to view a brochure, toggle interest on products, and signal readiness to discuss — all without authentication, using the access token.

## Why

Customers access the brochure via a unique link (no login). These endpoints power the public brochure page and must work without session cookies, using only the access token for identification.

## Requirements

- Create `apps/api/src/routes/public-brochures.ts` with the following endpoints:

- **GET /:token** — Get brochure data for public view
  - Look up brochure by `accessToken`
  - Return 404 if not found
  - Return 410 Gone if `expiresAt < now` or `archivedAt` is set
  - LEFT JOIN `brochure_products` with `products` — handle archived/deleted products gracefully (skip products where the join returns null, or include with a flag)
  - LEFT JOIN `productCategories` for category name
  - Include tenant branding: join `tenants` for `name`, `logoUrl` (as `hasLogo` boolean)
  - Include `message`, `readyToDiscussAt`, product list with `isInterested` state
  - **Do NOT expose**: pricing, supplier info, internal notes, cost data, tenant email/phone

- **POST /:token/interest/:productId** — Toggle interest on a product
  - Look up brochure by token, verify not expired/archived (410 if so)
  - Find the `brochure_products` row matching `brochureId` + `productId`
  - Return 404 if product not in brochure
  - Toggle `isInterested`: if currently true, set false and clear `interestedAt`; if currently false, set true and set `interestedAt` to now
  - Return the updated interest state

- **POST /:token/ready** — Mark "ready to discuss"
  - Look up brochure by token, verify not expired/archived (410 if so)
  - Handle idempotently: if `readyToDiscussAt` is already set, return success with existing timestamp (do not overwrite)
  - If not set, update `readyToDiscussAt` to now
  - Return the timestamp

- Mount in `apps/api/src/index.ts`: `app.route('/api/public/brochures', publicBrochuresRoutes)` in the public routes section (lines 79-84), alongside `publicQuotesRoutes`

## Constraints

- No authentication middleware — these routes are fully public
- Token-based access only: the 64-char hex token is the sole authorization
- Must not expose any pricing, cost, or margin data
- LEFT JOIN products to handle the case where a product has been archived or deleted since the brochure was created
- Tenant scoping is implicit via the brochure's tenantId (no need to verify separately since the token maps to exactly one brochure)

## Implementation Notes

Follow the pattern in `apps/api/src/routes/public-quotes.ts`:
- `const publicBrochuresRoutes = new Hono()`
- Token lookup: `db.select().from(brochures).where(eq(brochures.accessToken, token)).limit(1)`
- Expiry check: `if (brochure.expiresAt && new Date(brochure.expiresAt) < new Date()) return 410`
- Archive check: `if (brochure.archivedAt) return 410`

For the product query, join `brochureProducts` → `products` (LEFT) → `productCategories` (LEFT):
```typescript
const items = await db
  .select({
    id: brochureProducts.id,
    productId: brochureProducts.productId,
    sortOrder: brochureProducts.sortOrder,
    isInterested: brochureProducts.isInterested,
    interestedAt: brochureProducts.interestedAt,
    productName: products.name,
    productDescription: products.description,
    productImageUrl: products.imageUrl,
    categoryName: productCategories.name,
  })
  .from(brochureProducts)
  .leftJoin(products, eq(brochureProducts.productId, products.id))
  .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
  .where(eq(brochureProducts.brochureId, brochure.id))
  .orderBy(asc(brochureProducts.sortOrder));
```

For product images in the public response, include the raw `imageUrl` (S3 key). The frontend public page will need to either use unsigned URLs or the image will need to be served through a proxy. Check how `public-quotes.ts` handles product images — if it uses a proxy route like `/api/logo/:tenantId`, the same approach should be used here.

## Validation

1. Start dev server: `bun run dev`
2. Create a brochure via the staff API (TASK-011) to get an access token
3. Fetch public brochure: `curl http://localhost:3000/api/public/brochures/{token}` — verify products, message, tenant info returned, no pricing
4. Toggle interest: `curl -X POST http://localhost:3000/api/public/brochures/{token}/interest/{productId}` — verify isInterested flips
5. Toggle again — verify it flips back
6. Mark ready: `curl -X POST http://localhost:3000/api/public/brochures/{token}/ready` — verify timestamp returned
7. Call ready again — verify idempotent (same timestamp, no error)
8. Test with expired brochure — verify 410 response

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
