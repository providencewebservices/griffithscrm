# Griffiths CRM - AWS Infrastructure

Cost-conscious AWS infrastructure for Griffiths CRM using Terraform.

## Architecture

- **VPC**: Public subnets only (no NAT Gateway - saves ~$32/month)
- **ECS Fargate**: Runs API container with FARGATE_SPOT for cost savings
- **RDS PostgreSQL**: Single-AZ t4g.micro instance (~$12/month)
- **ALB**: Application Load Balancer for API
- **CloudFront + S3**: Static web hosting for React frontend
- **S3 + CloudFront**: Dedicated public media delivery path
- **S3**: Private document storage with lifecycle policies

**Estimated monthly cost: ~$25-35/month** (single user, minimal traffic)

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0
3. Domain name (optional but recommended)

## Quick Start

### 1. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
web_domain         = "griffiths.uwchlanventures.com"
api_domain         = "griffiths-api.uwchlanventures.com"
media_domain       = "media.griffiths.uwchlanventures.com"
better_auth_secret = "generate-a-32-char-random-string"
route53_zone_id    = "Z1234567890ABC"  # Optional
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Initialize and Deploy

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply (this will take 10-15 minutes)
terraform apply
```

### 3. Manual DNS Setup (if not using Route53)

If `route53_zone_id` is empty, you'll need to manually add DNS records.

After `terraform apply`, check the outputs:
```bash
terraform output api_certificate_validation
terraform output web_certificate_validation
```

Add the CNAME records to your DNS provider, then wait for certificate validation.

Also add:
- `griffiths-api.uwchlanventures.com` → ALB DNS name (from `terraform output alb_dns_name`)
- `griffiths.uwchlanventures.com` → CloudFront domain (from `terraform output cloudfront_domain_name`)
- `media.griffiths.uwchlanventures.com` → Media CloudFront domain (from `terraform output media_cloudfront_domain_name`)

### 4. Build and Deploy Application

#### Build and push API Docker image:

```bash
# Get ECR login
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_url)

# Build from project root
cd ..
docker build -t $(cd terraform && terraform output -raw ecr_repository_url):latest -f apps/api/Dockerfile .
docker push $(cd terraform && terraform output -raw ecr_repository_url):latest

# Force ECS to pull new image
aws ecs update-service \
  --cluster $(cd terraform && terraform output -raw ecs_cluster_name) \
  --service griffiths-crm-prod-api \
  --force-new-deployment \
  --region eu-west-2
```

#### Build and deploy web frontend:

```bash
cd apps/web
bun run build

# Sync to S3
aws s3 sync dist/ s3://$(cd ../../terraform && terraform output -raw web_bucket_name) --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(cd ../../terraform && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Cost Breakdown

| Resource | Estimated Cost |
|----------|---------------|
| RDS t4g.micro | ~$12/month |
| ECS Fargate (SPOT) | ~$5-10/month |
| ALB | ~$16/month (fixed) + usage |
| CloudFront | ~$0-2/month |
| S3 | ~$0-1/month |
| **Total** | **~$25-35/month** |

## Scaling Up

When you need more capacity:

1. **More API instances**: Increase `api_desired_count`
2. **Larger API containers**: Increase `api_cpu` and `api_memory`
3. **Larger database**: Change `db_instance_class` to `db.t4g.small` or higher
4. **Multi-AZ database**: Enable `multi_az = true` in rds.tf

## Destroying Infrastructure

```bash
# This will delete everything including the database!
terraform destroy
```

**Warning**: This will delete all data. Create a manual RDS snapshot first if needed.

## Troubleshooting

### ECS Task Won't Start

Check logs:
```bash
aws logs tail /ecs/griffiths-crm-prod --follow
```

### Certificate Validation Pending

If using Route53, certificates should auto-validate. Otherwise, ensure DNS records are correctly added.

### Database Connection Issues

1. Check security groups allow traffic from ECS tasks
2. Verify DATABASE_URL in SSM Parameter Store
3. Check ECS task has correct IAM permissions
