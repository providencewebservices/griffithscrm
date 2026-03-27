variable "aws_region" {
  description = "AWS region to deploy to"
  type        = string
  default     = "eu-west-2" # London
}

variable "environment" {
  description = "Environment name (e.g., prod, staging)"
  type        = string
  default     = "prod"
}

variable "web_domain" {
  description = "Domain name for the web frontend (e.g., griffiths.uwchlanventures.com)"
  type        = string
}

variable "api_domain" {
  description = "Domain name for the API (e.g., griffiths-api.uwchlanventures.com)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for DNS records (optional - leave empty to skip DNS)"
  type        = string
  default     = ""
}

# Neon Database
variable "neon_database_url" {
  description = "Neon pooled database connection URL"
  type        = string
  sensitive   = true
}

variable "neon_database_url_direct" {
  description = "Neon direct (non-pooled) database connection URL for migrations"
  type        = string
  sensitive   = true
}

# ECS
variable "api_cpu" {
  description = "CPU units for the API container (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "api_memory" {
  description = "Memory for the API container in MB"
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

# Application
variable "better_auth_secret" {
  description = "Secret key for Better Auth"
  type        = string
  sensitive   = true
}

# OAuth - Google
variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}

# OAuth - Microsoft
variable "microsoft_client_id" {
  description = "Microsoft OAuth client ID"
  type        = string
  default     = ""
}

variable "microsoft_client_secret" {
  description = "Microsoft OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}


# SES Email
variable "ses_from_email" {
  description = "From email address for SES (must be verified in SES)"
  type        = string
  default     = ""
}

variable "ses_region" {
  description = "AWS region where SES is configured"
  type        = string
  default     = "us-east-2"
}

# S3 Documents
variable "s3_documents_bucket_name" {
  description = "Name for the S3 documents bucket (must be globally unique)"
  type        = string
  default     = ""
}

# Gmail Push Notifications (Pub/Sub)
variable "google_pubsub_topic" {
  description = "Google Pub/Sub topic name for Gmail push notifications (e.g., projects/my-project/topics/gmail-push)"
  type        = string
  default     = ""
}

variable "gmail_webhook_token" {
  description = "Shared secret token for Gmail webhook validation (generate with: openssl rand -hex 32)"
  type        = string
  sensitive   = true
  default     = ""
}

# TakePayments
variable "takepayments_encryption_key" {
  description = "TakePayments AES-256-GCM encryption key (32-byte hex, generate with: openssl rand -hex 32)"
  type        = string
  sensitive   = true
}

variable "payment_token_secret" {
  description = "Payment token HMAC-SHA256 secret (32-byte hex, generate with: openssl rand -hex 32)"
  type        = string
  sensitive   = true
}

# VPC CIDR
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
