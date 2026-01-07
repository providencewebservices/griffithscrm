# S3 Bucket for Document Storage
resource "aws_s3_bucket" "documents" {
  bucket = var.s3_documents_bucket_name != "" ? var.s3_documents_bucket_name : "${local.name}-documents"

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# Lifecycle rules for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# CORS configuration for presigned URLs
resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "https://${var.web_domain}",
      "http://localhost:5173" # Development
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Store bucket name in SSM for the API
resource "aws_ssm_parameter" "s3_documents_bucket" {
  name        = "/${local.name}/s3/documents-bucket"
  description = "S3 bucket for documents"
  type        = "String"
  value       = aws_s3_bucket.documents.id

  tags = local.tags
}
