# RDS → Neon Migration Plan

Migration from AWS RDS PostgreSQL 16 to Neon PostgreSQL 17.

## Current State

| Layer | Current | Evidence |
|-------|---------|----------|
| Database | RDS PostgreSQL 16 on `db.t4g.micro` | `terraform/rds.tf` |
| Driver | `postgres` (postgres.js) ^3.4.5 (installed 3.4.7) | `packages/shared/package.json` |
| ORM | Drizzle 0.45.1 via `drizzle-orm/postgres-js` | `packages/shared/src/db/index.ts:1` |
| Connection | Single `DATABASE_URL` env var | `packages/shared/src/db/index.ts:5` |
| Prod secrets | AWS SSM Parameter Store (SecureString) | `terraform/rds.tf:109`, `terraform/ecs.tf:242` |
| Prod SSL | `?sslmode=require` appended in Terraform | `terraform/rds.tf:113` |
| PG features | JSONB (1 col), composite primary keys, indexes, numeric precision — all standard PG, no extensions | `packages/shared/src/db/schema.ts` |
| Migrations | 45 Drizzle SQL files (0000–0044) | `packages/shared/drizzle/` |
| Local dev | Docker Compose `postgres:16` | `docker-compose.yml` |

## Why This Migration Is Low-Risk

- No RDS-specific features used — no Performance Insights API calls, no IAM auth, no RDS Proxy, no custom parameter groups consumed by app code
- No PostgreSQL extensions — no `uuid-ossp`, `pgcrypto`, `pg_trgm`, etc.
- All PG features used (JSONB, composite primary keys, indexes, numeric precision) are fully supported by Neon and PG 17
- postgres.js driver works natively with Neon — no driver swap needed
- Single connection string — the entire app connects via one `DATABASE_URL`
- PG 17 is backward compatible with PG 16 for all features used

## What Does NOT Change

- Drizzle ORM — same version, same driver, same queries
- All application code — zero query changes needed
- Migration workflow — `bun run db:generate` / `bun run db:migrate` works identically
- S3, SES, ECS, CloudFront, ALB — completely unaffected
- BetterAuth — uses the same database, no auth changes
- Local development (keeping Docker Compose postgres)

---

## Phase 1: Neon Setup

> Manual steps, no code changes.

- [x] Create a Neon project with PostgreSQL 17
- [x] Note the two connection strings Neon provides:
  - **Pooled** (via PgBouncer): `postgresql://user:pass@ep-xxx-pooler.eu-west-2.aws.neon.tech/griffiths_crm?sslmode=require` — for application queries
  - **Direct**: `postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/griffiths_crm?sslmode=require` (without `-pooler` in hostname) — for migrations
- [ ] Optionally create a `dev` branch in Neon for non-production use

## Phase 2: Application Code Changes

> Update the database client and migration script to support separate pooled/direct connection strings.

### A. `packages/shared/src/db/index.ts` — No changes needed ✅

The `createDb` function takes a connection string parameter, so callers control which URL is used. No change required.

### B. `apps/api/scripts/migrate.ts` — Use `DATABASE_URL_DIRECT` for migrations ✅

Neon's built-in PgBouncer runs in transaction mode, which doesn't support `SET` statements or advisory locks that Drizzle migrations may use. The direct connection bypasses the pooler.

```typescript
// Changed to:
const DATABASE_URL = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
```

### C. `packages/shared/drizzle.config.ts` — Prefer `DATABASE_URL_DIRECT` ✅

Updated `dbCredentials.url` to use the direct connection:

```typescript
dbCredentials: {
  url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL!,
},
```

### D. Test locally

Confirm no regressions — local Docker Compose postgres still works with the fallback since `DATABASE_URL_DIRECT` won't be set locally.

## Phase 3: Terraform Changes

> Remove RDS infrastructure, update secrets and networking.

### A. Remove the RDS module — `terraform/rds.tf` ✅

Deleted the entire file.

### B. Update `terraform/main.tf` ✅

Removed `random_password.db_password` and the `random` provider (no longer needed).

### C. Update `terraform/variables.tf` ✅

Replaced RDS variables with `neon_database_url` and `neon_database_url_direct` (both sensitive).

### D. Update `terraform/ecs.tf` ✅

Added Neon SSM parameters (`database_url`, `database_url_direct`) and `DATABASE_URL_DIRECT` secret to ECS task definition.

### E. Update `terraform/vpc.tf` ✅

Removed RDS security group, database subnets, and database subnet group.

### F. Update `terraform/outputs.tf` ✅

Removed `database_subnets`, `rds_endpoint`, and `rds_database_name` outputs.

### G. Update `terraform/terraform.tfvars` ✅

Replaced RDS variables with empty Neon URL placeholders (to be populated at cutover).

## Phase 4: Docker Compose (Local Dev)

- [ ] Bump postgres image from `postgres:16` to `postgres:17-alpine` in `docker-compose.yml` to match Neon's version
- [ ] Keep the local postgres service — provides offline development and fast local queries

## Phase 5: Data Migration

- [ ] Take a `pg_dump` from RDS:
  ```bash
  pg_dump -Fc -h <rds-endpoint> -U griffiths_admin -d griffiths_crm > griffiths_crm_backup.dump
  ```
- [ ] Restore into Neon:
  ```bash
  pg_restore -h <neon-endpoint> -U <neon-user> -d griffiths_crm --no-owner --no-privileges griffiths_crm_backup.dump
  ```
- [ ] Verify: run the app against Neon, check key queries (customers, quotes, emails, payments)

Alternative: Neon's dashboard has a guided import flow that can pull directly from an RDS endpoint if you temporarily allow Neon's IPs through the security group.

## Phase 6: Cutover

- [ ] Put app in maintenance mode (or accept brief downtime)
- [ ] Take final `pg_dump` from RDS
- [ ] Restore into Neon
- [ ] Update `terraform.tfvars` with Neon connection strings
- [ ] `terraform apply` to update SSM parameters (and remove RDS)
- [ ] Deploy (ECS picks up new secrets on next task launch — force new deployment):
  ```bash
  aws ecs update-service --cluster griffiths-crm-prod --service griffiths-crm-prod-api --force-new-deployment --region eu-west-2
  ```
- [ ] Verify app is working against Neon
- [ ] Confirm RDS resources are destroyed by terraform apply

## Phase 7: Cleanup

- [ ] Update `CLAUDE.md`:
  - Change PostgreSQL reference from 16 to 17
  - Replace RDS mentions with Neon
  - Add note about `DATABASE_URL_DIRECT` for migrations
  - Remove `db_instance_class`, `db_allocated_storage` references
- [ ] Update `.env.example` with comments noting Neon connection strings in production
- [ ] Delete `terraform/rds.tf` file if not already done during terraform apply

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Neon cold starts (compute spins down after inactivity) | Enable "Always On" compute on paid plan, or accept ~500ms cold start on first query |
| PgBouncer transaction mode limitations | Using direct connection for migrations via `DATABASE_URL_DIRECT` (Phase 2) |
| Data loss during cutover | Final `pg_dump` right before cutover; keep RDS running until Neon confirmed stable |
| Neon doesn't support a needed extension | Verified: no extensions used — non-issue |
| PG 16 → 17 incompatibility | PG 17 is backward compatible; no breaking changes for features used |

## Cost Comparison

| | RDS (`db.t4g.micro`) | Neon |
|---|---|---|
| Base cost | ~$12/mo compute + storage | Free tier: 0.5 GiB storage, 191 compute hours |
| With current usage | ~$15-25/mo (storage, backups, PI) | Likely $0-19/mo on Launch plan |
| Scaling | Manual instance class upgrade | Autoscale compute, pay per use |
| Branching | Not available | Built-in (great for preview deploys) |
| Connection pooling | Need RDS Proxy ($$$) or self-managed | Built-in PgBouncer |
