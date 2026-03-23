# Feature Plan: External Product API

## Overview
Public, read-only REST API at `/api/external/{tenant-slug}/` exposing product catalog data (categories, products, materials, finishes) for consumption by tenant websites, plus an in-app API documentation tab in the CRM settings.

## Source
`FEATURE-PRODUCT-API.md`

---

## Phase 1: API — Tenant Resolution & Shared Infrastructure

- [x] **Task 1: Create external API route file with tenant slug resolution and CORS**
  - Create `apps/api/src/routes/external-products.ts` with a new Hono router
  - Apply open CORS **inside the subrouter** via `router.use('*', cors({ origin: '*' }))` — this ensures the external routes get permissive CORS regardless of the global restrictive CORS in `index.ts` (which uses `credentials: true` and restricted origins)
  - Create a tenant slug resolution middleware (inline in the route file) that:
    - Extracts `:slug` from the URL path
    - Queries `tenants` table: `WHERE slug = :slug`
    - Returns `404 { "error": "Not found" }` if no tenant matches
    - Sets `tenantId` on Hono context via `c.set('externalTenantId', tenant.id)`
  - Add `externalTenantId: string` to the existing `ContextVariableMap` interface in `apps/api/src/middleware/auth.ts` (lines 23-28)
  - Add cache-control middleware that sets `Cache-Control: public, max-age=300` on all responses from this router
  - Register route in `apps/api/src/index.ts` in the public routes section (near line 79, alongside `publicQuotesRoutes`):
    ```typescript
    app.route('/api/external', externalProductsRoutes);
    ```
  - Validation: `bun run dev`, `curl -v http://localhost:3000/api/external/nonexistent-slug/categories` → 404. Verify `Access-Control-Allow-Origin: *` header on response. Verify `Cache-Control: public, max-age=300` header.

## Phase 2: API — Endpoints

- [x] **Task 2: Implement GET /api/external/:slug/categories**
  - In `apps/api/src/routes/external-products.ts`, add `GET /:slug/categories`
  - Read `externalTenantId` from context (set by middleware in Task 1)
  - Query `productCategories` where `tenantId` matches, ordered by `sortOrder` asc
  - Map response to expose only: `id`, `name`, `description`, `imageUrl`, `sortOrder`
  - Strip: `tenantId`, `createdAt`, `updatedAt`
  - Return: `{ "categories": [...] }`
  - Validation: `curl http://localhost:3000/api/external/{valid-slug}/categories` → returns categories JSON. Verify no `tenantId` or timestamp fields in response.

- [x] **Task 3: Implement GET /api/external/:slug/products (list with pagination)**
  - Add `GET /:slug/products` endpoint
  - Accept query params via Zod: `page` (default 1, `z.coerce.number()`), `limit` (default 20, max 100), `categoryId` (optional string)
  - Query `products` table joined with `productCategories` for category name
  - Filter: `tenantId` match, `isActive = true`, `archivedAt IS NULL`
  - If `categoryId` provided, add category filter
  - Paginate using offset/limit pattern (matching `apps/api/src/routes/products.ts` list endpoint)
  - Map response to expose: `id`, `sku`, `name`, `description`, `imageUrl`, `category: { id, name }` (null if no category)
  - Strip: `tenantId`, `supplierId`, `supplierProductId`, `isActive`, `archivedAt`, timestamps
  - Return: `{ "products": [...], "pagination": { page, limit, total, totalPages } }`
  - Validation: `curl` with `?page=1&limit=5` → verify correct pagination math. `curl` with `?categoryId=xxx` → verify filtering. Confirm no sensitive fields in response.

- [x] **Task 4: Implement GET /api/external/:slug/products/:productId (basic detail with options)**
  - Add `GET /:slug/products/:productId` endpoint
  - Query the product with tenant check, verifying `isActive = true` and `archivedAt IS NULL` — return 404 if not found, inactive, or archived
  - Join `productCategories` for category info (matching the select pattern in `apps/api/src/routes/products.ts` `getProductWithRelations`)
  - Fetch product options ordered by `sortOrder`, and for each option, fetch choices ordered by `sortOrder` (using `Promise.all` pattern from existing `getProductWithRelations`)
  - Expose on options: `id`, `name`, `type`, `isRequired`, `sortOrder`
  - Expose on choices: `id`, `name`, `priceAdjustment`, `imageUrl`, `sortOrder` — `priceAdjustment` and `imageUrl` are customer-facing values, not supplier costs
  - Return: `{ "product": { id, sku, name, description, imageUrl, category, options: [{ ...option, choices: [...] }] } }`
  - Validation: `curl` with valid product ID → full detail with nested options/choices. Invalid/archived product ID → 404. Verify `priceAdjustment` and `imageUrl` are present on choices.

- [ ] **Task 5: Add components and dimension combos to product detail**
  - Extend the `GET /:slug/products/:productId` handler from Task 4
  - Fetch `productComponents` for the product, ordered by `sortOrder` — note: this query pattern is in `apps/api/src/routes/product-components.ts`, not in `getProductWithRelations`
  - Fetch `dimensionCombos` for the product where `isActive = true`, ordered by `sortOrder` — note: dimension combos have an `isActive` field that must be filtered
  - For each active combo, fetch `dimensionComboValues` joined with `productComponents` to get `componentType` and component `name`
  - Expose on components: `id`, `componentType`, `name`, `quantity`, `sortOrder`
  - Expose on dimension combos: `id`, `name`, `priceAdjustment`, `sortOrder`
  - Expose on combo values: `componentId`, `componentType`, `componentName`, `dimension1`, `dimension2`, `dimension3`
  - Strip: all `tenantId`, timestamps, IDs that are internal references only
  - Return extended shape: `{ "product": { ...existing, components: [...], dimensionCombos: [{ ...combo, values: [...] }] } }`
  - Validation: `curl` product detail → verify components and dimensionCombos arrays are present. Verify inactive dimension combos are excluded.

- [ ] **Task 6: Implement GET /api/external/:slug/materials**
  - Add `GET /:slug/materials` endpoint
  - Query `materialSections` for the tenant, ordered by `sortOrder` asc
  - For each section, query `materials` where `sectionId` matches and `isActive = true`, ordered by `sortOrder`
  - Exclude sections that have zero active materials (empty sections are not useful to website consumers)
  - Expose on sections: `id`, `name`, `sortOrder`
  - Expose on materials: `id`, `name`, `imageUrl`, `sortOrder`
  - Strip: `tenantId`, `supplierId`, `isActive`, timestamps
  - Return: `{ "sections": [{ ...section, materials: [...] }] }`
  - Validation: `curl` → returns grouped materials. Verify inactive materials are excluded. Verify sections with no active materials are omitted.

- [ ] **Task 7: Implement GET /api/external/:slug/finishes**
  - Add `GET /:slug/finishes` endpoint
  - Query `finishes` for the tenant where `isActive = true`, ordered by `sortOrder` asc
  - Expose: `id`, `name`, `sortOrder`
  - Strip: `tenantId`, `isActive`, timestamps
  - Return: `{ "finishes": [...] }`
  - Validation: `curl` → returns finishes array. Verify inactive finishes are excluded.

## Phase 3: Frontend — In-App API Documentation

- [ ] **Task 8: Add "API" tab to Settings page**
  - In `apps/web/src/pages/customer/settings.tsx`:
    - Add `'api'` to the `SettingsTab` union type
    - Add API tab entry to `TAB_GROUPS` in the "System" group (alongside integrations/payments), using `Code2` icon from lucide-react
    - Add `case 'api': return <ApiTab />;` in `SettingsContent` switch
    - Add import for `ApiTab` from `@/components/customer/settings/api-tab`
  - Create `apps/web/src/components/customer/settings/api-tab.tsx` as a stub component:
    - Return a `Card` with `CardHeader` containing title "API Documentation"
    - Use `useTenantSettingsQuery()` to load tenant slug, show loading/error states matching existing tab patterns
  - Validation: `bun run dev`, navigate to `/app/settings?tab=api` → see the stub tab in the sidebar under the System group. Verify loading state works.

- [ ] **Task 9: Build API documentation tab — base URL and endpoint reference**
  - In `apps/web/src/components/customer/settings/api-tab.tsx`, replace the stub with full content:
  - **Base URL card**: Display computed URL `${VITE_API_URL}/api/external/${slug}` in a styled code block. Add "Copy" button using `navigator.clipboard.writeText()` with `toast.success('Copied')` feedback.
  - **Endpoint reference**: One `Card` per endpoint showing:
    - Method `Badge` (variant `secondary` or `outline`, text "GET")
    - Path (relative to base URL, e.g., `/categories`)
    - Short description
    - Query parameters table where applicable (products list: `page`, `limit`, `categoryId`)
    - Static example JSON response in a `<pre className="bg-muted rounded-md p-4 overflow-x-auto"><code className="text-sm">` block
  - **Usage notes card** at the bottom: cache behavior (5 minute TTL), CORS (any origin allowed), no authentication required
  - Use existing components: `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`, `Button`
  - Follow existing tab styling: `space-y-8` between cards, consistent heading sizes
  - Validation: Navigate to `/app/settings?tab=api` → see full documentation. Click "Copy" → clipboard has correct URL. JSON examples render in monospace. All 5 endpoints documented.

---

## Notes

- **Rate limiting**: Intentionally deferred. The external API serves public catalog data and sits behind CloudFront in production. Rate limiting can be added at the infrastructure level (CloudFront/WAF) or via Hono middleware in a future iteration.
- **No tenant metadata in responses**: The external API does not include tenant info (name, logo) in product responses. Website consumers already know the tenant from the slug they're using.
- **No pricing data exposed**: Supplier costs and markup percentages are never included. Only customer-facing `priceAdjustment` values on option choices and dimension combos are exposed, as these represent relative price differences, not absolute costs.
