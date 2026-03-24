# TASK-010: Add brochures and brochure_products tables to database schema

## Objective

Add the `brochures` and `brochure_products` tables to the database schema to support the customer brochure feature.

## Why

The brochure feature requires persistent storage for brochure metadata (customer, message, access token, expiry) and the many-to-many relationship between brochures and products. This schema must exist before any API or UI work can begin.

## Requirements

- Add `brochures` table to `packages/shared/src/db/schema.ts` with columns:
  - `id` (text, primary key)
  - `tenantId` (text, not null, FK to tenants.id, cascade delete)
  - `customerId` (text, not null, FK to customers.id, set null on delete)
  - `createdById` (text, not null, FK to users.id, set null on delete)
  - `message` (text, nullable) — staff freeform message
  - `accessToken` (text, unique) — cryptographically random token for public URL
  - `expiresAt` (timestamp, not null) — when the brochure expires
  - `readyToDiscussAt` (timestamp, nullable) — set when customer clicks "Ready to Discuss"
  - `archivedAt` (timestamp, nullable) — soft archive
  - `emailSentAt` (timestamp, nullable) — last email send timestamp
  - `emailSentCount` (integer, not null, default 0) — total emails sent
  - `createdAt` (timestamp, not null, defaultNow)
  - `updatedAt` (timestamp, not null, defaultNow)

- Add `brochureProducts` table to `packages/shared/src/db/schema.ts` with columns:
  - `id` (text, primary key)
  - `brochureId` (text, not null, FK to brochures.id, cascade delete)
  - `productId` (text, not null, FK to products.id, set null on delete)
  - `sortOrder` (integer, not null, default 0)
  - `isInterested` (boolean, not null, default false)
  - `interestedAt` (timestamp, nullable) — set when customer toggles interest on
  - `createdAt` (timestamp, not null, defaultNow)

- Add a unique partial index: one active (non-archived) brochure per customer per tenant. Use `uniqueIndex` with a SQL `WHERE` clause filtering `archived_at IS NULL`.

- Generate migration files with `bun run db:generate`
- Apply migration with `bun run db:migrate`

## Constraints

- Follow the existing table definition patterns in `schema.ts` (text IDs, timestamp columns, FK references)
- Use the same FK cascade patterns as `quotePackages` (e.g., `onDelete: 'set null'` for customerId and createdById)
- The `accessToken` must be unique (like `quotePackages.accessToken` at line 925 of schema.ts)
- Tables are automatically re-exported via `packages/shared/src/db/index.ts` barrel export — no separate export file needed

## Implementation Notes

Place the new table definitions after the existing `quotePackages`/`quotes` section in `schema.ts` (around line 940). Follow the exact column definition style used throughout the file (e.g., `text('column_name')`, `timestamp('column_name')`, `.notNull()`, `.defaultNow()`).

For the unique partial index, Drizzle supports this pattern:
```typescript
(table) => ({
  activePerCustomer: uniqueIndex('brochures_active_per_customer')
    .on(table.tenantId, table.customerId)
    .where(sql`archived_at IS NULL`),
})
```

Reference `quotePackages` (line 888-939) for the access token and email tracking column patterns.

## Validation

1. Run `bun run db:generate` — verify a new migration SQL file is created in `packages/shared/drizzle/`
2. Run `bun run db:migrate` — verify migration applies without errors
3. Open Drizzle Studio (`bun run db:studio`) and verify both `brochures` and `brochure_products` tables exist with the correct columns
4. Verify the unique partial index exists: inserting two non-archived brochures for the same customer+tenant should fail

## Completion Notes

When complete, update `.viktor/tasks.json` (set `done: true` for this task), append `.viktor/logs/LOG.md`, create one git commit, and emit the appropriate promise tag.
