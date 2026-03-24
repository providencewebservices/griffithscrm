# TASK-011: Create authenticated brochure API routes (staff CRUD)

## Objective

Build the staff-facing API endpoints for creating, listing, viewing, updating, and archiving brochures.

## Why

Staff need to manage brochures through the admin UI. These endpoints provide the backend for all authenticated brochure operations before the frontend can be built.

## Requirements

- Create `apps/api/src/routes/brochures.ts` with the following endpoints:

- **POST /** — Create a new brochure
  - Zod validation: `customerId` (required), `message` (optional string), `expiresAt` (optional, defaults to 30 days from now), `products` (array of `{ productId, sortOrder }`)
  - Generate `accessToken` using `crypto.randomBytes(32).toString('hex')`
  - Generate `id` using `crypto.randomUUID()`
  - Archive any existing active brochure for this customer+tenant (set `archivedAt`)
  - Insert brochure row and brochure_products rows
  - Return the created brochure with id and accessToken

- **GET /** — List brochures for the tenant
  - Query params: `page`, `limit`, `search` (customer name), `status` filter (`active`, `expired`, `archived`, `all`)
  - Default: exclude archived, show active + expired
  - Join customers table for customer name
  - Include product count (subquery or join)
  - Include `readyToDiscussAt` for status display
  - Return paginated response: `{ brochures, pagination: { page, limit, total, totalPages } }`

- **GET /:id** — Get brochure detail
  - Join brochure_products with products (LEFT JOIN products — handle archived/deleted products gracefully)
  - Include customer info (name, email from contactInfo join)
  - Include readyToDiscussAt, interest states on each product
  - Verify tenant ownership
  - Return 404 if not found

- **PATCH /:id** — Update brochure
  - Zod validation: `message` (optional), `expiresAt` (optional), `products` (optional array — if provided, replaces all brochure_products)
  - Verify tenant ownership
  - Set `updatedAt`

- **DELETE /:id** — Archive brochure
  - Set `archivedAt` to now (soft delete, not hard delete)
  - Verify tenant ownership

- Mount in `apps/api/src/index.ts`: `app.route('/api/brochures', brochuresRoutes)` in the tenant routes section (near line 150, alongside quotes)

## Constraints

- All endpoints must use `requireAuth` and `requireTenant` middleware (imported from `../middleware/auth`)
- All queries must filter by `tenantId` from the authenticated user's session
- Follow the validation and error handling patterns from `apps/api/src/routes/products.ts`
- Use Zod schemas with `zValidator('json', schema)` for POST/PATCH bodies and `zValidator('query', schema)` for GET query params

## Implementation Notes

Follow the CRUD pattern established in `apps/api/src/routes/products.ts`:
- Import auth middleware from `../middleware/auth`
- Import db from `../lib/auth`
- Import schema tables from `@griffiths-crm/shared/db/schema`
- Use `const currentUser = c.get('user')` and `currentUser.tenantId!` for tenant scoping

For the list endpoint, reference the pagination pattern in `products.ts` (page/limit/total/totalPages). For the customer name join, reference how `quotes.ts` joins customer data.

For the access token generation, use:
```typescript
import crypto from 'crypto';
const accessToken = crypto.randomBytes(32).toString('hex');
```

For the customer email lookup (used in detail view), join `customerContactInfo` with `contactInfo` where `type = 'email'`, following the pattern in `quotes.ts` send-email section (~line 2008).

## Validation

1. Start dev server: `bun run dev`
2. Create a brochure via curl (with valid session cookie):
   ```
   curl -X POST http://localhost:3000/api/brochures -H 'Content-Type: application/json' -d '{"customerId":"...","message":"Test","products":[{"productId":"...","sortOrder":0}]}'
   ```
3. List brochures: `GET /api/brochures` — verify the created brochure appears
4. Get detail: `GET /api/brochures/:id` — verify products and customer info
5. Update: `PATCH /api/brochures/:id` — verify message changes
6. Archive: `DELETE /api/brochures/:id` — verify archivedAt is set and brochure excluded from default list
7. Create a second brochure for the same customer — verify the first is automatically archived

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
