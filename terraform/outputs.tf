# VPC Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnets" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnets
}

# ECS Outputs
output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

# ALB Outputs
output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.api.dns_name
}

output "api_url" {
  description = "API URL"
  value       = var.route53_zone_id != "" ? "https://${var.api_domain}" : "https://${aws_lb.api.dns_name}"
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.web.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.web.domain_name
}

output "web_url" {
  description = "Web frontend URL"
  value       = var.route53_zone_id != "" ? "https://${var.web_domain}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}

# S3 Outputs
output "web_bucket_name" {
  description = "S3 bucket name for web frontend"
  value       = aws_s3_bucket.web.id
}

output "documents_bucket_name" {
  description = "S3 bucket name for documents"
  value       = aws_s3_bucket.documents.id
}

# Deployment Commands
output "deployment_commands" {
  description = "Commands to deploy the application"
  value       = <<-EOT

    # === DEPLOYMENT COMMANDS ===

    # 1. Build and push API Docker image:
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.api.repository_url}
    docker build -t ${aws_ecr_repository.api.repository_url}:latest -f apps/api/Dockerfile .
    docker push ${aws_ecr_repository.api.repository_url}:latest

    # 2. Force new ECS deployment:
    aws ecs update-service --cluster ${aws_ecs_cluster.main.name} --service ${aws_ecs_service.api.name} --force-new-deployment --region ${var.aws_region}

    # 3. Build and deploy web frontend:
    cd apps/web && bun run build
    aws s3 sync dist/ s3://${aws_s3_bucket.web.id} --delete
    aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.web.id} --paths "/*"

  EOT
}

# Certificate validation (for manual DNS validation if not using Route53)
output "api_certificate_validation" {
  description = "DNS validation records for API certificate (add these to your DNS if not using Route53)"
  value = var.route53_zone_id == "" ? {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : null
}

output "web_certificate_validation" {
  description = "DNS validation records for web certificate (add these to your DNS if not using Route53)"
  value = var.route53_zone_id == "" ? {
    for dvo in aws_acm_certificate.web.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  } : null
}
