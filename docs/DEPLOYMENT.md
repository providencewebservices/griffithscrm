# Deployment Guide

This guide covers deploying Griffiths CRM to AWS.

## Architecture

- **Frontend**: React SPA hosted on S3 + CloudFront
- **Backend**: Bun/Hono API running on ECS Fargate
- **Database**: PostgreSQL on RDS
- **Storage**: S3 for document uploads

## Prerequisites

1. **AWS CLI** configured with credentials
2. **Terraform** installed (v1.0+)
3. **Bun** installed (v1.1+)
4. **Docker** for building API images

## Infrastructure Setup (First Time)

### 1. Configure Terraform Variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
aws_region        = "us-east-1"
project_name      = "griffiths-crm"
environment       = "production"

# Domains (must be configured in Cloudflare)
web_domain        = "griffiths.example.com"
api_domain        = "griffiths-api.example.com"

# Database
db_password       = "your-secure-db-password"

# Auth
better_auth_secret = "your-32-char-secret-key"

# OAuth (optional)
google_client_id     = ""
google_client_secret = ""
microsoft_client_id  = ""
microsoft_client_secret = ""
```

### 2. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:
- VPC with public subnets
- RDS PostgreSQL instance
- ECS cluster and service
- ALB with HTTPS
- S3 buckets for frontend and documents
- CloudFront distribution
- ECR repository

### 3. Configure DNS in Cloudflare

After terraform apply, get the ALB and CloudFront DNS names from outputs:

```bash
terraform output
```

In Cloudflare, create:
- `griffiths-api.example.com` → CNAME → ALB DNS name (proxy disabled)
- `griffiths.example.com` → CNAME → CloudFront distribution

## Initial Deployment

### 1. Build and Push API Image

```bash
# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -f apps/api/Dockerfile -t griffiths-crm-api .

# Tag and push
docker tag griffiths-crm-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/griffiths-crm-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/griffiths-crm-api:latest
```

### 2. Deploy API to ECS

Force a new deployment to pull the latest image:

```bash
aws ecs update-service \
  --cluster griffiths-crm \
  --service griffiths-crm-api \
  --force-new-deployment
```

The container automatically runs database migrations on startup via `docker-entrypoint.sh`.

### 3. Build and Deploy Frontend

```bash
# Build frontend
cd apps/web
bun run build

# Deploy to S3
aws s3 sync dist/ s3://griffiths-crm-frontend/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <distribution-id> \
  --paths "/*"
```

### 4. Bootstrap Admin User

Use ECS Exec to run the bootstrap script inside the running container:

```bash
# Find running task ID
TASK_ARN=$(aws ecs list-tasks --cluster griffiths-crm --service-name griffiths-crm-api --query 'taskArns[0]' --output text)

# Connect and run bootstrap
aws ecs execute-command \
  --cluster griffiths-crm \
  --task $TASK_ARN \
  --container api \
  --interactive \
  --command "/bin/sh -c 'ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourSecurePassword123! bun run scripts/bootstrap-admin.ts'"
```

Requirements for ECS Exec:
- AWS CLI v2 with Session Manager plugin
- IAM permissions for `ecs:ExecuteCommand`
- VPC endpoints or internet access for SSM

## Ongoing Deployments

### Database Migrations

Migrations run automatically when the container starts. To add new migrations:

```bash
# 1. Make schema changes in packages/shared/src/db/schema.ts

# 2. Generate migration file
bun run db:generate

# 3. Test locally
bun run db:migrate

# 4. Commit migration files in packages/shared/drizzle/

# 5. Build and deploy new API image (migrations run on container start)
```

### Deploying Code Changes

**API changes:**
```bash
# Build and push new image
docker build -f apps/api/Dockerfile -t griffiths-crm-api .
docker tag griffiths-crm-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/griffiths-crm-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/griffiths-crm-api:latest

# Force new deployment
aws ecs update-service --cluster griffiths-crm --service griffiths-crm-api --force-new-deployment
```

**Frontend changes:**
```bash
cd apps/web
bun run build
aws s3 sync dist/ s3://griffiths-crm-frontend/ --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Debugging

### View API Logs

```bash
aws logs tail /ecs/griffiths-crm --follow
```

### Connect to Running Container

```bash
TASK_ARN=$(aws ecs list-tasks --cluster griffiths-crm --service-name griffiths-crm-api --query 'taskArns[0]' --output text)

aws ecs execute-command \
  --cluster griffiths-crm \
  --task $TASK_ARN \
  --container api \
  --interactive \
  --command "/bin/sh"
```

### Check Service Health

```bash
# Service status
aws ecs describe-services --cluster griffiths-crm --services griffiths-crm-api

# Recent deployments
aws ecs describe-services --cluster griffiths-crm --services griffiths-crm-api --query 'services[0].deployments'

# Health check endpoint
curl https://griffiths-api.example.com/health
```

## Environment Variables

### API Container

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (from SSM) |
| `BETTER_AUTH_SECRET` | Auth session secret (from SSM) |
| `BETTER_AUTH_URL` | Full API URL (e.g., https://api.example.com) |
| `CORS_ORIGIN` | Frontend URL for CORS |
| `NODE_ENV` | Set to "production" |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret (optional) |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID (optional) |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret (optional) |

### Frontend Build

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full API URL (baked into build) |

## Cost Optimization

The infrastructure is configured for cost efficiency:

- **Fargate Spot**: Uses spot instances for non-critical workloads
- **Single AZ RDS**: No multi-AZ for dev/staging environments
- **t3.micro RDS**: Smallest instance class
- **14-day log retention**: Shorter CloudWatch retention
- **Container Insights disabled**: Enable only when debugging
