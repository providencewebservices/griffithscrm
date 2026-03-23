# Feature: External Product API

## Overview

Expose the tenant's product catalog via a public, read-only REST API that can be consumed by the tenant's external website. The API is scoped per-tenant using the tenant slug in the URL path and requires no authentication.

This feature also adds an **API Documentation page** inside the CRM app so that tenant users can see their available endpoints, understand the data shapes, and copy example requests.

---

## Problem

Tenants manage their product catalog (categories, products, options, dimensions, materials, finishes) inside the CRM but have no way to surface that data on their public-facing website. Currently, product information must be manually duplicated or hardcoded on the website.

## Goals

1. **Public read-only API** — A website can fetch product catalog data without authentication.
2. **Tenant-scoped via slug** — Each tenant's catalog is accessed via their unique slug (e.g., `/api/external/{slug}/products`).
3. **Only active, non-archived data** — The API never exposes draft, inactive, or archived items.
4. **No sensitive data** — No supplier costs, markup percentages, internal notes, or tenant configuration details are exposed.
5. **In-app documentation** — Tenant users can view interactive API docs within the CRM settings, including their tenant-specific base URL and example requests.

---

## API Design

### Base Path

```
/api/external/{tenant-slug}
```

The tenant slug is validated on every request. If the slug doesn't match a tenant, the API returns `404`.

### CORS

The external API routes should allow requests from any origin (`*`) since they are intended for consumption by external websites. This is separate from the existing CORS config which restricts to the CRM frontend origin.

### Rate Limiting

Not included in the initial implementation. Can be added later via Hono middleware or at the infrastructure level (CloudFront, WAF).

### Endpoints

#### 1. `GET /api/external/{slug}/categories`

Returns all active product categories for the tenant, ordered by `sortOrder`.

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Headstones",
      "description": "Full memorial headstones",
      "imageUrl": "https://...",
      "sortOrder": 1
    }
  ]
}
```

**Fields exposed:** `id`, `name`, `description`, `imageUrl`, `sortOrder`
**Fields excluded:** `tenantId`, `createdAt`, `updatedAt`

---

#### 2. `GET /api/external/{slug}/products`

Returns all active, non-archived products for the tenant. Supports filtering and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `categoryId` | string | — | Filter by category |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "sku": "HS-001",
      "name": "Classic Headstone",
      "description": "A traditional memorial headstone",
      "imageUrl": "https://...",
      "category": {
        "id": "uuid",
        "name": "Headstones"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Fields exposed:** `id`, `sku`, `name`, `description`, `imageUrl`, `category.id`, `category.name`
**Fields excluded:** `tenantId`, `supplierId`, `supplierProductId`, `isActive`, `archivedAt`, `createdAt`, `updatedAt`

---

#### 3. `GET /api/external/{slug}/products/{productId}`

Returns a single product with its full public detail: options, choices, components, and dimension combos.

**Response:**
```json
{
  "product": {
    "id": "uuid",
    "sku": "HS-001",
    "name": "Classic Headstone",
    "description": "A traditional memorial headstone",
    "imageUrl": "https://...",
    "category": {
      "id": "uuid",
      "name": "Headstones"
    },
    "options": [
      {
        "id": "uuid",
        "name": "Stone Color",
        "type": "stone_color",
        "isRequired": true,
        "sortOrder": 1,
        "choices": [
          {
            "id": "uuid",
            "name": "Black Granite",
            "priceAdjustment": "50.00",
            "imageUrl": "https://...",
            "sortOrder": 1
          }
        ]
      }
    ],
    "components": [
      {
        "id": "uuid",
        "componentType": "headstone",
        "name": "Main Headstone",
        "quantity": 1,
        "sortOrder": 1
      }
    ],
    "dimensionCombos": [
      {
        "id": "uuid",
        "name": "Standard",
        "priceAdjustment": "0.00",
        "sortOrder": 1,
        "values": [
          {
            "componentId": "uuid",
            "componentType": "headstone",
            "componentName": "Main Headstone",
            "dimension1": "24",
            "dimension2": "18",
            "dimension3": "3"
          }
        ]
      }
    ]
  }
}
```

**Fields excluded:** All supplier costs, markup percentages, `tenantId`, timestamps.

---

#### 4. `GET /api/external/{slug}/materials`

Returns all active materials grouped by their sections (color families), ordered by `sortOrder`.

**Response:**
```json
{
  "sections": [
    {
      "id": "uuid",
      "name": "Black",
      "sortOrder": 1,
      "materials": [
        {
          "id": "uuid",
          "name": "Nero Assoluto",
          "imageUrl": "https://...",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

**Fields excluded:** `tenantId`, `supplierId`, `isActive`, timestamps.

---

#### 5. `GET /api/external/{slug}/finishes`

Returns all active finishes, ordered by `sortOrder`.

**Response:**
```json
{
  "finishes": [
    {
      "id": "uuid",
      "name": "Polished",
      "sortOrder": 1
    }
  ]
}
```

---

## Shared Response Conventions

- All responses use `Content-Type: application/json`.
- All endpoints return `Cache-Control: public, max-age=300` (5 minutes) to allow CDN caching without serving stale data for too long.
- Error responses follow the existing pattern: `{ "error": "message" }`.
- `404` if the tenant slug is not found.
- `400` for invalid query parameters.

---

## In-App API Documentation

### Location

A new **"API" tab** within the existing Settings page (`/app/settings?tab=api`).

### Content

The documentation page should display:

1. **Base URL** — The tenant's specific base URL, computed from the current environment and tenant slug (e.g., `https://api.griffithscrm.co.uk/api/external/griffiths-memorials`).
2. **Endpoint reference** — Each endpoint with:
   - Method and path
   - Description
   - Query parameters (if any)
   - Example response (static, representative JSON)
   - A "Copy URL" button for the tenant's endpoint
3. **Usage notes** — Cache behavior, rate limits, CORS information.

### Design

This is a read-only reference page, not an interactive API explorer. It should be styled consistently with the rest of the settings UI using existing shadcn components (Card, Tabs, Code blocks). The JSON examples should be displayed in a monospace code block.

---

## Data Filtering Rules

All external API endpoints enforce these rules:

| Rule | Implementation |
|------|----------------|
| Tenant match | `WHERE tenantId = (SELECT id FROM tenants WHERE slug = :slug)` |
| Active only | `WHERE isActive = true` (where the column exists) |
| Not archived | `WHERE archivedAt IS NULL` (where the column exists) |
| No sensitive fields | Response mappers strip `tenantId`, supplier info, costs, markups, timestamps |

---

## Architecture Decisions

### Why slug-based, not API-key-based?

- The data is public catalog information — there's nothing sensitive.
- Slug-based URLs are simpler for website developers to integrate.
- No key management overhead for tenants.
- API keys can be added later as an optional layer if rate limiting or analytics per-consumer are needed.

### Why a separate `/api/external/` prefix?

- Clear separation from authenticated `/api/tenant/` routes.
- Different CORS policy (open vs restricted).
- Different caching behavior (public caching headers).
- Easy to apply different rate limits or WAF rules at the infrastructure level.

### Why cache headers instead of a caching layer?

- CloudFront already sits in front of the API in production.
- Setting `Cache-Control` headers lets CloudFront cache responses automatically.
- Avoids additional infrastructure (Redis, etc.) for the initial implementation.

### Why not expose pricing?

- Retail pricing in the CRM is derived from supplier costs + markup, and is intended for quote generation, not public display.
- Tenants may want different pricing on their website vs. quotes.
- Price display on the website is a separate concern — the external API provides catalog structure, and the website can add its own pricing layer if needed.

---

## Out of Scope

- **Write operations** — The external API is strictly read-only.
- **Authentication/API keys** — Not needed for public catalog data. Can be added later.
- **Rate limiting** — Deferred to infrastructure layer.
- **Webhook notifications** — No push notifications when catalog changes. Websites poll or rely on cache expiry.
- **Search/full-text** — Simple filtering only. Full-text search can be added later.
- **Lettering/pricing data** — Not exposed externally. These are internal quoting concerns.
- **Sundries** — Not exposed in v1. Can be added if tenants want to show add-on items on their website.
