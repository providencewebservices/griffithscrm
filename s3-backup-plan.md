# S3 Cross-Account Backup Plan

## Decisions

| Question | Answer |
|----------|--------|
| Source account | Current account (eu-west-2) -- default AWS CLI profile |
| Destination account | `117572456137` -- AWS CLI profile `covalt` |
| Scope | **Documents bucket only** (`griffiths-crm-prod-documents`) |
| Copy type | One-time copy |
| Version history | Current versions only |
| Destination region | `eu-west-2` (same) |
| Lifecycle rules | Mirror source (90d -> IA, non-current 365d -> expire) |

## Critical Constraint: Key Structure Preservation

The app stores full S3 URLs in the database in columns like `image_url`, `logo_url` across many tables. The URL format is:

```
https://{bucket-name}.s3.eu-west-2.amazonaws.com/{tenantId}/documents/{entityType}/{entityId}/{uuid}-{filename}
```

The `extractKeyFromUrl()` function in `apps/api/src/lib/s3.ts` strips the bucket name to get the key, and `getPublicUrl()` rebuilds URLs using the `S3_BUCKET` env var.

**To switch the app to the backup copy, two things are needed:**

1. Change the `S3_BUCKET` env var to the new bucket name
2. Run a SQL find-and-replace on all URL columns in the database:
   ```sql
   -- For each table/column that stores S3 URLs:
   UPDATE tenants SET logo_url = REPLACE(logo_url, 'griffiths-crm-prod-documents', '{new-bucket-name}') WHERE logo_url IS NOT NULL;
   UPDATE categories SET image_url = REPLACE(image_url, 'griffiths-crm-prod-documents', '{new-bucket-name}') WHERE image_url IS NOT NULL;
   -- ... repeat for all image_url/logo_url columns
   ```

**Tables with S3 URL columns:**
- `tenants` -> `logo_url`
- `categories` -> `image_url`
- `products` -> `image_url`
- `product_options` -> `image_url`
- `sundry_items` -> `image_url`
- `materials` -> `image_url`
- `material_options` -> `image_url`
- `memorial_products` -> `image_url`
- `documents` -> `image_url`

The key paths themselves (`{tenantId}/...`) are preserved exactly, so only the bucket name in the URL needs updating.

---

## Implementation Plan

### Phase 1: Check Data Size -- DONE

- [x] 630 objects, 27.5 MB total. `s3 sync` confirmed as the right approach.

### Phase 2: Create Destination Bucket (in account 117572456137) -- DONE

- [x] Created `griffiths-crm-backup-documents` in `eu-west-2`
- [x] Versioning enabled
- [x] AES256 encryption with bucket key enabled
- [x] All public access blocked
- [x] Lifecycle rule: 90d -> STANDARD_IA, non-current 30d -> IA, non-current 365d -> expire
- [x] Bucket policy allowing cross-account access from source account `677276089645`:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::677276089645:root"
        },
        "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:ListBucket"],
        "Resource": [
          "arn:aws:s3:::griffiths-crm-backup-documents",
          "arn:aws:s3:::griffiths-crm-backup-documents/*"
        ]
      }
    ]
  }
  ```

### Phase 3: IAM in Source Account -- SKIPPED

Source user `bryan` has `AdministratorAccess` + `AmazonS3FullAccess`. No additional policy needed.

### Phase 4: Run the Copy -- DONE

- [x] Ran `aws s3 sync` from default profile. Completed with zero errors.

  ```bash
  aws s3 sync \
    s3://griffiths-crm-prod-documents \
    s3://griffiths-crm-backup-documents \
    --region eu-west-2 \
    --no-progress \
    --only-show-errors
  ```

### Phase 5: Verify -- DONE

- [x] Object counts match: **630 objects, 27,500,620 bytes** on both sides
- [ ] Spot-check: download 3-5 random objects from destination and verify they're valid
- [ ] Verify key structure: pick a known document URL from the database, swap the bucket name, and confirm the object exists in the destination

### Re-run Command

To refresh the backup at any point in the future:

```bash
aws s3 sync s3://griffiths-crm-prod-documents s3://griffiths-crm-backup-documents --region eu-west-2 --no-progress --only-show-errors
```

---

## Disaster Recovery Runbook

If the source account is lost and you need to run the app from the backup:

1. **S3**: Change `S3_BUCKET` env var to `griffiths-crm-backup-documents`
2. **Database**: Run URL replacement on all S3 URL columns (see SQL above)
3. **IAM**: Ensure the new ECS task role in account `117572456137` has read/write on the backup bucket
4. **CORS**: Update the backup bucket's CORS config to match the new web domain
5. **App**: Deploy the app pointing at the new bucket -- no code changes needed

---

## Notes

- `aws s3 sync` preserves key paths exactly -- no transformation needed
- The web bucket (`griffiths-crm-prod-web`) is excluded -- it can be rebuilt from source
- The terraform state bucket is excluded -- it can be reconstructed via `terraform import`
- If you want to re-run the copy later (e.g. monthly), just re-run the same `s3 sync` command -- it only copies new/changed objects
