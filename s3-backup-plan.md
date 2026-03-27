# S3 Cross-Account Backup Plan

## Current S3 Inventory

| Bucket | Name Pattern | Purpose | Versioning | Lifecycle |
|--------|-------------|---------|------------|-----------|
| Web | `griffiths-crm-prod-web` | Frontend static assets (React SPA) | Enabled | None |
| Documents | `griffiths-crm-prod-documents` | Multi-tenant document storage (images, proofs, attachments, fonts, logos, brochures, etc.) | Enabled | 90d -> IA, non-current 365d -> expire |
| Terraform State | `griffiths-crm-terraform-state` | Terraform state files | Enabled | None |

- All buckets: `eu-west-2`, AES256 encryption, bucket keys enabled, all public access blocked.
- Documents bucket has CORS configured for presigned URL access.
- Documents bucket key pattern: `{tenantId}/documents/{entityType}/{entityId}/{uuid}-{filename}`
- Web bucket is served via CloudFront with OAC.

## Open Questions

> Fill in answers below each question, then we can build the implementation plan.

### 1. Destination AWS Account

- Account ID: _______
- Do you have credentials/CLI access to it? _______
- Is there an existing IAM user or role we can use for the copy? _______

### 2. Scope -- Which Buckets?

- [ ] **Documents** (business-critical, multi-tenant data)
- [ ] **Web** (can be rebuilt from source via `bun run build`)
- [ ] **Terraform State** (can be regenerated with `terraform import`, but history is useful)

### 3. One-Time Copy or Ongoing Replication?

- [ ] **One-time copy** -- snapshot of current state, done once
- [ ] **Ongoing replication** -- S3 Cross-Account Replication Rule, keeps destination in sync automatically

### 4. Version History

- [ ] **Current versions only** -- just the latest version of each object
- [ ] **All versions** -- full version history (important if you need audit trail / rollback)

### 5. Destination Region

- [ ] Same region (`eu-west-2`)
- [ ] Different region: _______

### 6. Lifecycle Rules in Destination

- [ ] **Mirror source** -- same lifecycle rules (90d IA transition, 365d non-current expiry)
- [ ] **Cold storage** -- e.g. everything in S3 Glacier or IA immediately
- [ ] **No lifecycle** -- keep everything in Standard, we'll figure it out later

### 7. Implementation Approach

- [ ] **Terraform** -- define destination bucket + replication in IaC (best for ongoing replication)
- [ ] **Shell script** -- `aws s3 sync` one-liner (best for one-time copy)
- [ ] **Both** -- Terraform for the bucket, script for the initial bulk copy

### 8. Approximate Data Size

- Small (< 1 GB): `aws s3 sync` is fine
- Medium (1-100 GB): `aws s3 sync` works, may take a while
- Large (100 GB+): consider S3 Batch Operations
- Unknown -- we can check with: `aws s3 ls s3://griffiths-crm-prod-documents --recursive --summarize | tail -2`

---

## Implementation Plan

> To be filled in once the above questions are answered.

### Phase 1: Setup

- [ ] Create destination bucket in target account (Terraform or console)
- [ ] Configure bucket policy to allow cross-account access from source account
- [ ] Set up encryption, versioning, and lifecycle rules on destination

### Phase 2: IAM

- [ ] Create IAM role/policy in source account with `s3:GetObject`, `s3:ListBucket` on source
- [ ] Create IAM role/policy in destination account with `s3:PutObject`, `s3:PutObjectAcl` on destination
- [ ] If ongoing replication: create replication IAM role in source account

### Phase 3: Copy/Replicate

- [ ] Run initial bulk copy (or enable replication rule)
- [ ] Verify object counts and sizes match between source and destination
- [ ] Verify a sample of objects are readable in destination account

### Phase 4: Verify & Monitor

- [ ] Compare object counts: `aws s3 ls --recursive --summarize` on both sides
- [ ] Spot-check a few documents by downloading from destination
- [ ] If ongoing: set up CloudWatch alarms for replication failures

---

## Notes

- The documents bucket is the critical one -- it contains customer data, job proofs, quotes, and business documents that cannot be rebuilt from source.
- The web bucket can always be rebuilt from a `bun run build` + `aws s3 sync`.
- The terraform state bucket is useful to back up but can be reconstructed via `terraform import` if lost.
