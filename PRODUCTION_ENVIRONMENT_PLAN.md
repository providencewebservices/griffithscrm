# Production Environment Plan

## Goal

Add a second deployed AWS environment for Griffiths CRM.

- Existing default-profile AWS deployment becomes staging.
- New `covalt` AWS account deployment becomes production.
- Staging keeps its current public URLs.
- Production uses Griffiths Memorials URLs.
- The current Neon database becomes production; staging may share it temporarily until a new staging database is created.

## Current State

The active Terraform lives in `terraform/`.

Current deployment facts from Terraform:

- AWS region is `eu-west-2`.
- Terraform state currently uses S3 backend bucket `griffiths-crm-terraform-state`, key `prod/terraform.tfstate`, and DynamoDB lock table `griffiths-crm-terraform-locks`.
- Resource names derive from `local.name = "griffiths-crm-${var.environment}"`.
- Current `terraform.tfvars` sets `environment = "prod"`, `web_domain = "griffiths.uwchlanventures.com"`, and `api_domain = "griffiths-api.uwchlanventures.com"`.
- The API runs on ECS Fargate behind an ALB.
- The frontend is built into S3 and served through CloudFront.
- Documents and public media are separate S3 buckets.
- Database connectivity is through Neon URLs stored as SSM SecureString parameters.

Some docs still mention RDS. Treat the active Terraform as source of truth: the current deployment uses Neon.

## Target Environments

### Staging

- AWS account: current default AWS CLI profile.
- Existing resource names may continue to say `prod` for now.
- Public frontend URL: `griffiths.uwchlanventures.com`.
- Public API URL: `griffiths-api.uwchlanventures.com`.
- Database: current Neon database temporarily, until staging receives a new Neon database.
- Purpose: keep the current deployment stable and avoid destructive resource renaming.

### Production

- AWS account: AWS CLI profile `covalt`.
- AWS region: `eu-west-2`.
- Terraform environment name: `production`.
- Public frontend URL: `crm.griffithsmemorials.com`.
- Public API URL: `api.griffithsmemorials.com`.
- Public media URL: `media.griffithsmemorials.com`.
- Database: the current Neon database becomes the production database. Staging may share it temporarily, but staging should later move to a new Neon database.
- S3 buckets should use clean production names, not the existing backup bucket name.
- SES sender: `noreply@griffithsmemorials.com`.

Recommended bucket names:

- `griffiths-crm-production-web`
- `griffiths-crm-production-documents`
- `griffiths-crm-production-public-media`

## DNS and Certificates

DNS is controlled by the client through their provider.

- Keep `route53_zone_id = ""`.
- Terraform should output ACM DNS validation records.
- Provide those records to the client.
- Assume validation will be completed externally.
- After validation, provide final DNS target records to the client:
  - `crm.griffithsmemorials.com` CNAME to the production CloudFront distribution.
  - `api.griffithsmemorials.com` CNAME to the production ALB DNS name.
  - `media.griffithsmemorials.com` CNAME to the production media CloudFront distribution.

Production should have a dedicated public media domain from the start. Because production DNS is not managed in Route53, the media certificate follows the same manual ACM validation flow as the web and API certificates.

## S3 Data Migration

The existing copied bucket is named `griffiths-crm-backup-documents`, but that should not become the permanent production bucket name.

Plan:

1. Let Terraform create clean production buckets in the `covalt` account.
2. Copy private documents into `griffiths-crm-production-documents`.
3. Copy public media into `griffiths-crm-production-public-media`.
4. Rebuild and deploy the frontend into `griffiths-crm-production-web`; no web bucket copy is needed.

The user will run the S3 copy commands manually after the buckets exist.

Important: object keys must be preserved exactly.

## Neon and S3 URL Caveat

The current Neon database becomes the production database. Staging may share it temporarily until staging receives a new Neon database.

The app stores full S3 URLs in database columns such as tenant logos, category images, product images, and document image URLs. Production will not rely on read access to old staging bucket URLs, and no compatibility layer should be added for old bucket URLs.

Production readiness depends on copying the S3 objects into the production buckets with keys preserved exactly and verifying that existing media and document records resolve correctly through the production S3/media setup.

Preferred approach:

- Production uses production buckets for new uploads.
- Existing S3 contents are copied into the production documents and public media buckets with object keys preserved exactly.
- Production does not get read access to old staging/source buckets.
- No compatibility logic is added for old bucket URLs.
- Staging gets its own Neon database later, instead of production moving away from the current Neon database.

## Terraform Refactor Plan

### 1. Split Backend Config

Replace the hard-coded backend details with partial backend configuration and per-environment backend files.

Proposed files:

- `terraform/backends/staging.hcl`
- `terraform/backends/production.hcl`

Staging backend should point at the existing default-account state.

Production backend should use a new state bucket and lock table in the `covalt` account with globally unique names.

Example production names:

- State bucket: `griffiths-crm-production-terraform-state`
- Lock table: `griffiths-crm-production-terraform-locks`

### 2. Split Variable Files

Create environment-specific tfvars files.

Proposed files:

- `terraform/env/staging.tfvars`
- `terraform/env/production.tfvars`

Staging vars preserve existing domains and current settings.

Production vars set:

```hcl
aws_region  = "eu-west-2"
environment = "production"

web_domain = "crm.griffithsmemorials.com"
api_domain = "api.griffithsmemorials.com"
media_domain = "media.griffithsmemorials.com"
route53_zone_id = ""

s3_documents_bucket_name    = "griffiths-crm-production-documents"
s3_public_media_bucket_name = "griffiths-crm-production-public-media"
ses_from_email              = "noreply@griffithsmemorials.com"
```

Production should use the current Neon URLs. Staging can reuse them temporarily, but the longer-term direction is to give staging a separate new Neon database.

### 3. Bootstrap Production State

The existing bootstrap Terraform creates the staging/default-account state bucket and lock table. Production needs equivalent bootstrap resources in the `covalt` account.

Create a separate production bootstrap config rather than parameterizing the existing bootstrap Terraform.

Run bootstrap using `AWS_PROFILE=covalt`.

### 4. Make Deploy Scripts Environment-Aware

Current helper scripts are hard-coded to the existing default-account deployment.

Update or replace them so deploy commands accept an environment:

- staging: default AWS profile, existing resource names, existing URLs.
- production: `AWS_PROFILE=covalt`, production resource names, production URLs.

Frontend builds must use the correct API URL:

- staging: `VITE_API_URL=https://griffiths-api.uwchlanventures.com`
- production: `VITE_API_URL=https://api.griffithsmemorials.com`

### 5. Documentation Cleanup

Update deployment docs after the Terraform split.

Cleanup items:

- Stop describing the current deployment as RDS-backed where Terraform uses Neon.
- Document staging vs production commands.
- Document manual DNS validation workflow.
- Document S3 copy steps and the temporary shared-Neon S3 URL caveat.
- Remove or avoid committing plaintext secrets in example files.

## Suggested Implementation Order

1. Create production bootstrap/state plan.
2. Split Terraform backend configuration.
3. Split Terraform variable files.
4. Create production bucket names and production Terraform vars.
5. Plan production Terraform with `AWS_PROFILE=covalt`.
6. Apply enough production Terraform to create certificates and buckets.
7. Provide ACM validation records to the client.
8. Copy documents and public media into new production buckets, preserving object keys exactly.
9. Complete production Terraform apply after DNS certificate validation.
10. Build and push production API image to production ECR.
11. Deploy production frontend with production `VITE_API_URL`.
12. Provide final DNS CNAME targets to the client.
13. Verify API health, frontend loading, auth, uploads, existing media/documents, SES from `noreply@griffithsmemorials.com`, and payment callbacks.

## Open Questions

None.

## Non-Goals For Initial Work

- Do not rename existing staging AWS resources from `prod` to `staging`.
- Do not rewrite S3 URL fields during the initial production setup while staging may still share the current Neon database.
- Do not migrate to Route53 unless the DNS ownership situation changes.
- Do not copy frontend S3 contents; rebuild and deploy from source.
- Do not grant production read access to old staging/source S3 buckets.
- Do not add compatibility logic for old bucket URLs.
