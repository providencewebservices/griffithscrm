# Public Media Delivery Plan

This document captures the recommended long-term plan for making website-facing images reliably consumable from the external API without weakening the security posture of the current private upload bucket.

## Goal

Provide stable, cacheable image URLs for customer websites consuming the external catalog API while keeping internal documents and other sensitive uploads private.

## Current State

### What works today

- The external catalog API is intended for third-party website consumption.
- The external routes explicitly allow open CORS and short public caching.
- Internal staff flows can upload images.
- Internal staff UI can render many stored image URLs by converting them to signed S3 read URLs.

### What does not work well today

- External API responses currently pass through raw `imageUrl` values from the database.
- Those stored URLs point at the private S3 documents bucket.
- Customer websites can fetch the JSON, but they cannot depend on the returned image URLs being directly readable.
- The current internal workaround for image rendering depends on authenticated sign-url endpoints, which are not suitable as the public contract for customer websites.

### Evidence in the repo

- Private-bucket assumption in upload helper:
  - `apps/api/src/lib/s3.ts`
- Authenticated sign-url endpoints:
  - `apps/api/src/routes/uploads.ts`
- Internal signed-url client logic:
  - `apps/web/src/hooks/use-uploads.ts`
- UI comment explicitly noting raw S3 URLs will not load:
  - `apps/web/src/components/ui/image-upload.tsx`
- External API returning DB `imageUrl` values directly:
  - `apps/api/src/routes/external-products.ts`
- Public brochure route already signs catalog images server-side for public use:
  - `apps/api/src/routes/public-brochures.ts`
- Private bucket with blocked public access:
  - `terraform/s3-documents.tf`
- CloudFront currently fronts only the web SPA bucket, not uploaded media:
  - `terraform/cloudfront.tf`

## Recommendation

Introduce a dedicated public media delivery path for website-safe assets and keep the existing documents bucket private.

The recommended target architecture is:

1. A separate S3 bucket for public catalog media.
2. A separate CloudFront distribution for media delivery, for example `media.<domain>`.
3. The media bucket remains private at the S3 layer and is readable only through CloudFront Origin Access Control.
4. External API responses return stable CloudFront URLs for website-facing images.
5. The current private documents bucket continues to serve documents, jobs, fonts, and other internal/private uploads via signed URLs or explicit proxy routes.

This is preferred over signed URLs as the long-term API contract because stable public media URLs are a better fit for customer websites, CDN caching, CMS integrations, and static rendering.

## Why Not Just Make the Existing Bucket Public

Do not make the current documents bucket public.

Reasons:

- The bucket is intentionally private today.
- The bucket is shared across multiple upload categories, not only public catalog media.
- Broad public exposure would create avoidable risk for documents and other non-public files.
- The current bucket and helpers were designed around signed access for private content.

The current upload categories include both clearly public and clearly private classes of content. Based on `apps/api/src/lib/s3.ts`, the existing system mixes:

- `products`
- `options`
- `sundries`
- `categories`
- `materials`
- `jobs`
- `documents`
- `fonts`
- `branding`

That mixed-use design is the strongest reason to split public media from private storage.

## Scope

### Phase 1 public media candidates

These should move to the new public media path first because they are already used in public or website-facing contexts:

- tenant logo
- product category images
- product images
- option choice images
- material images

### Phase 2 candidates

These can move later if needed:

- sundry images
- supplier collection images
- supplier category images
- supplier product images

These are stored in the schema today, but they are not part of the current public external catalog contract and do not need to block Phase 1.

## Data Model Strategy

### Recommended storage contract

Long term, avoid treating the database as the place that stores absolute S3 URLs for media.

Preferred direction:

- Store a media key or relative object path in the database.
- Derive the public URL in application code from a configured media base URL.

Example:

- DB stores: `tenant-123/products/prod-456/main.jpg`
- API returns: `https://media.example.com/tenant-123/products/prod-456/main.jpg`

Benefits:

- Easier to change CDN domain later.
- Easier to migrate providers or storage layout.
- Less brittle parsing logic.
- Cleaner distinction between storage identity and delivery URL.

### Migration-friendly compromise

If changing all image-bearing columns at once is too much for the first iteration:

- Keep the current columns temporarily.
- Allow them to contain either legacy private-bucket URLs or new CloudFront media URLs.
- Make the image helper layer support both formats during migration.

That lets us migrate without a flag day.

## Target Architecture

### Infrastructure

Add a dedicated public media stack:

- `aws_s3_bucket.public_media`
- versioning
- encryption
- lifecycle rules as appropriate
- `aws_s3_bucket_public_access_block.public_media`
- CloudFront Origin Access Control for media
- bucket policy allowing CloudFront to read objects
- `aws_cloudfront_distribution.media`
- optional Route53 or manual DNS for a media hostname

Do not reuse the existing web CloudFront distribution for media delivery. The current distribution is SPA-oriented and includes 403/404 fallback behavior that is not suitable for object delivery.

### App configuration

Add explicit configuration for public media:

- media bucket name
- media CDN base URL
- optional media region if needed

Current ECS env wiring in `terraform/ecs.tf` only injects a single `S3_BUCKET` pointing to the private documents bucket. The app will need separate config for private storage and public media delivery.

### Storage helper layer

Refactor the storage abstraction in `apps/api/src/lib/s3.ts` so the app can:

- upload to private storage
- upload to public media storage
- generate signed read URLs only for private storage
- return stable CDN URLs for public media
- recognize when a URL is already public and avoid attempting to sign it

This helper split is the key dependency for the rest of the rollout.

## Application Changes

### 1. Upload classification

Decide which upload categories map to public media versus private storage.

Recommended mapping:

- public media:
  - `products`
  - `options`
  - `categories`
  - `materials`
  - `branding`
- private:
  - `jobs`
  - `documents`
  - `fonts`

`sundries` can be decided based on whether they are intended for public catalog use in the near term. If in doubt, keep them private initially and revisit.

### 2. Upload route behavior

Update the image upload route behavior so public-facing categories:

- upload to the public media bucket
- return stable CDN-backed URLs

Private categories should continue to:

- upload to the private bucket
- rely on signed read URLs or explicit proxy routes

### 3. External API behavior

The external catalog API should return stable public media URLs directly. That means no signing step should be required by customer websites for:

- category images
- product images
- option choice images
- material images

### 4. Internal UI behavior

The admin UI currently signs many stored URLs before rendering them.

To avoid regressions:

- public media URLs should render directly
- legacy private-bucket URLs should still be signable during migration
- shared image-loading code should no-op for already-public URLs

This is important because the internal UI and public brochure flow currently assume many image values are private-bucket-backed.

### 5. Public brochure behavior

The public brochure route currently converts product image URLs to signed URLs server-side.

After public media rollout:

- if the brochure points to public media URLs, it should return them directly
- if the brochure still references legacy private-bucket URLs, it should keep signing them until migration is complete

## Migration Plan

Use a compatibility-first migration. Do not attempt a one-step cutover.

### Step 1. Add infrastructure and config

- create the public media bucket
- create the media CloudFront distribution
- wire environment/config values into ECS

### Step 2. Deploy dual-format app support

Before moving any data:

- deploy helper logic that understands both legacy private-bucket URLs and new public media URLs
- deploy upload logic that can route public categories to the new media destination

At the end of this step, the app should be able to function with mixed old/new image references.

### Step 3. Switch new uploads

Start writing new public image uploads to the public media path:

- new product/category/material/option-choice/logo uploads should produce public media URLs
- old records remain unchanged for now

### Step 4. Backfill existing records

Migrate existing public-facing images:

1. inventory records with non-null image/logo values
2. copy corresponding objects from the private bucket to the public media bucket
3. preserve a predictable key scheme
4. update DB rows to point at the new public media location, or to the new media key if the schema has already been normalized

### Step 5. Verify mixed-mode behavior

Before cleanup:

- confirm both old and new image references still render everywhere they need to
- confirm external websites can consume new media URLs directly

### Step 6. Cleanup

After all public-facing image records have been migrated:

- remove unnecessary signing on public media paths
- optionally deprecate legacy private-bucket image parsing for public image records

## Schema and Entity Migration Scope

Current image-bearing fields in the schema include:

- `tenants.logoUrl`
- `supplierCollections.imageUrl`
- `supplierCategories.imageUrl`
- `supplierProducts.imageUrl`
- `productCategories.imageUrl`
- `products.imageUrl`
- `optionChoices.imageUrl`
- `sundries.imageUrl`
- `materials.imageUrl`

Initial migration should prioritize fields that affect current public website consumption:

- `tenants.logoUrl`
- `productCategories.imageUrl`
- `products.imageUrl`
- `optionChoices.imageUrl`
- `materials.imageUrl`

## CORS and Browser Behavior

Important distinction:

- API CORS controls whether a website can fetch the JSON from the API.
- Media CORS controls whether the browser can fetch the image bytes from the media origin.

Those are separate concerns.

For the external API:

- current open CORS on external routes is appropriate

For media delivery:

- the media origin should support customer website usage
- if customer websites may use JavaScript `fetch()` against image URLs, the media origin should return `Access-Control-Allow-Origin` suitable for that usage
- if customer websites only use `<img src>`, cross-origin rendering is less strict, but stable readable URLs are still required

CloudFront response headers policy is the clean place to enforce the public-media CORS behavior.

## Testing and Validation

### Functional validation

- upload a new product image in admin
- confirm the stored reference is public-media-backed
- confirm the internal UI renders it without requiring signed private URLs
- confirm `/api/external/:slug/products` returns the stable media URL
- confirm a different origin can render the image from that URL
- confirm public brochure pages still render product images
- confirm documents and job files remain private

### Mixed-mode validation

- legacy private-bucket product images still load during migration
- new public-media product images also load
- the helper layer does not attempt to sign already-public URLs

### Operational validation

- CloudFront cache behavior is correct for media
- invalidation strategy is acceptable for image replacements
- ECS tasks have the correct bucket permissions
- no broadening of private-bucket read access occurred

## Work Breakdown

### Workstream A: Infrastructure

- add public media bucket
- add media CloudFront distribution
- add bucket policy and OAC wiring
- add DNS
- add ECS env/config for public media

### Workstream B: Storage Abstraction

- split private/public media handling in storage helper
- support stable public URL generation
- preserve private signed URL generation
- support mixed legacy and new URL formats

### Workstream C: Upload and Read Paths

- route public categories to public media
- keep private categories on private storage
- return public media URLs from external API
- keep internal and public read flows compatible during migration

### Workstream D: Data Migration

- inventory records
- copy objects
- update records
- verify mixed-mode rendering

### Workstream E: Cleanup

- remove unnecessary signing for public media
- trim legacy compatibility when safe

## Risks

### Risk: Partial migration breaks image rendering

Mitigation:

- deploy dual-format support before any data backfill

### Risk: Public media changes accidentally expose private files

Mitigation:

- use a separate public media bucket
- do not broaden access to the current documents bucket

### Risk: Internal UI assumes every image URL needs signing

Mitigation:

- make the helper layer explicitly recognize public media URLs

### Risk: Replaced images remain stale in caches

Mitigation:

- define cache-control and cache-busting strategy up front
- consider deterministic keys for immutable media or versioned keys for replacements

## Open Decisions

These should be resolved before implementation starts:

1. Should `sundries` be public in Phase 1 or Phase 2?
2. Do we want to normalize the DB to store media keys now, or accept dual-format URLs first and normalize later?
3. What media hostname should be used?
4. Do we want immutable media keys for replacements, or same-key overwrites plus invalidation?

## Acceptance Criteria

This work is complete when:

- customer websites can consume catalog image URLs from the external API without calling authenticated sign-url endpoints
- those URLs are stable public media URLs, not expiring signed URLs
- internal documents and job assets remain private
- public brochures still render product imagery correctly
- new public-facing uploads use the public media delivery path
- legacy data is either migrated or supported without regressions

