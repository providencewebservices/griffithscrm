# S3 Bucket for Public Media
resource "aws_s3_bucket" "public_media" {
  bucket = var.s3_public_media_bucket_name != "" ? var.s3_public_media_bucket_name : "${local.name}-public-media"

  tags = local.tags
}

resource "aws_s3_bucket_versioning" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled       = true
    blocked_encryption_types = ["SSE-C"]
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  rule {
    id     = "retain-current-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "HEAD"]
    allowed_origins = [
      "https://${var.web_domain}",
      "http://localhost:5173"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_ssm_parameter" "s3_public_media_bucket" {
  name        = "/${local.name}/s3/public-media-bucket"
  description = "S3 bucket for public media"
  type        = "String"
  value       = aws_s3_bucket.public_media.id

  tags = local.tags
}

# CloudFront for Public Media
resource "aws_cloudfront_origin_access_control" "public_media" {
  name                              = "${local.name}-public-media"
  description                       = "OAC for ${local.name} public media"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "public_media_cors" {
  name = "${local.name}-public-media-cors"

  cors_config {
    access_control_allow_credentials = false
    origin_override                  = true

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["*"]
    }

    access_control_expose_headers {
      items = ["ETag"]
    }
  }
}

resource "aws_acm_certificate" "media" {
  provider          = aws.us_east_1
  count             = var.media_domain != "" ? 1 : 0
  domain_name       = var.media_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

resource "aws_route53_record" "media_cert_validation" {
  for_each = var.route53_zone_id != "" && var.media_domain != "" ? {
    for dvo in aws_acm_certificate.media[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

resource "aws_acm_certificate_validation" "media" {
  provider                = aws.us_east_1
  count                   = var.route53_zone_id != "" && var.media_domain != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.media[0].arn
  validation_record_fqdns = [for record in aws_route53_record.media_cert_validation : record.fqdn]
}

resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = var.custom_domains_enabled && var.media_domain != "" ? [var.media_domain] : []
  price_class     = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.public_media.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.public_media.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.public_media.id
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${aws_s3_bucket.public_media.id}"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.public_media_cors.id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.custom_domains_enabled && var.media_domain != "" ? aws_acm_certificate.media[0].arn : null
    cloudfront_default_certificate = !(var.custom_domains_enabled && var.media_domain != "")
    ssl_support_method             = var.custom_domains_enabled && var.media_domain != "" ? "sni-only" : null
    minimum_protocol_version       = var.custom_domains_enabled && var.media_domain != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = local.tags
}

resource "aws_s3_bucket_policy" "public_media" {
  bucket = aws_s3_bucket.public_media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.public_media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.media.arn
          }
        }
      }
    ]
  })
}

resource "aws_route53_record" "media" {
  count   = var.route53_zone_id != "" && var.media_domain != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.media_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.media.domain_name
    zone_id                = aws_cloudfront_distribution.media.hosted_zone_id
    evaluate_target_health = false
  }
}
