# Griffiths CRM

A customer relationship management system for Griffiths Memorials, built with a modern TypeScript stack.

## Tech Stack

- **Frontend**: React + Vite + TanStack Router
- **Backend**: Hono.js API on Bun runtime
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with Google OAuth
- **Infrastructure**: AWS (ECS Fargate, RDS, S3, CloudFront)

## Key Features

### Quote Management
- Create and manage quotes for memorial services
- Track quote status through approval and conversion to jobs
- Public quote viewing links for customer approval

### Lettering Pricing System
The system uses a **pricing matrix** for lettering services:
- **Techniques**: The method used (e.g., "Sandblasted", "V-Cut")
- **Colors**: Optional paint finishes (e.g., "Gold Leaf", "White Paint")
- **Costs**: Price rules combining technique + color (optional) + work type

Price lookup follows this priority:
1. Specific color + specific work type (new memorial / refurbishment)
2. Specific color + "both" work types
3. Default (no color) + specific work type
4. Default (no color) + "both" work types

This allows flexible pricing where some colors may cost more than the base technique price.

## Project Structure

```
├── apps/
│   ├── api/          # Hono.js backend API
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared types, schemas, and database definitions
└── terraform/        # AWS infrastructure as code
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+)
- PostgreSQL (local or Docker)
- Google OAuth credentials (for authentication)

### Environment Setup

1. Copy environment files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. Configure your `.env` files with:
   - `DATABASE_URL` - PostgreSQL connection string
   - `BETTER_AUTH_SECRET` - Random secret for auth
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials

3. Install dependencies:
   ```bash
   bun install
   ```

4. Push database schema:
   ```bash
   bun run db:push
   ```

5. Start development servers:
   ```bash
   bun run dev
   ```

### Available Scripts

```bash
bun run dev          # Start all development servers
bun run build        # Build all packages
bun run build:web    # Build web app only
bun run build:api    # Build API only
bun run db:push      # Push schema changes to database (development)
bun run db:generate  # Generate SQL migration files
bun run db:studio    # Open Drizzle Studio
bun run media:backfill # Dry-run public media backfill (set APPLY=true to execute)
```

## Production Deployment

### AWS Infrastructure

The production environment runs on AWS with the following services:

- **ECS Fargate**: Runs the API container
- **RDS PostgreSQL**: Managed database (single-AZ for cost savings)
- **S3**: Static web hosting + private document storage + public media storage
- **CloudFront**: CDN for the web frontend
- **ALB**: Load balancer for the API
- **SSM Parameter Store**: Secrets management

### Deployment Commands

```bash
# 1. Build and push API Docker image
aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-2.amazonaws.com/griffiths-crm-prod-api
docker build --no-cache -t <account-id>.dkr.ecr.eu-west-2.amazonaws.com/griffiths-crm-prod-api:latest -f apps/api/Dockerfile .
docker push <account-id>.dkr.ecr.eu-west-2.amazonaws.com/griffiths-crm-prod-api:latest

# 2. Force ECS deployment
aws ecs update-service --cluster griffiths-crm-prod --service griffiths-crm-prod-api --force-new-deployment --region eu-west-2

# 3. Build and deploy frontend
cd apps/web && bun run build
aws s3 sync dist/ s3://griffiths-crm-prod-web --delete
aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
```

### Database Migrations

Production uses programmatic migrations via `drizzle-orm/postgres-js/migrator`, NOT the `drizzle-kit` CLI. Migrations run automatically on container startup via `docker-entrypoint.sh`.

To generate new migrations after schema changes:
```bash
bun run db:generate
```

Migration files are stored in `packages/shared/drizzle/`.

### Terraform

Infrastructure is managed with Terraform in the `terraform/` directory:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Key variables in `terraform.tfvars`:
- `web_domain` - Custom domain for frontend
- `api_domain` - Custom domain for API
- `media_domain` - Optional custom domain for public media delivery
- `route53_zone_id` - Set if using Route53 for DNS (leave empty for external DNS)

### ECS Exec (Shell Access)

For debugging or running one-off commands:

```bash
aws ecs execute-command \
  --cluster griffiths-crm-prod \
  --task <task-id> \
  --container api \
  --interactive \
  --command "/bin/sh" \
  --region eu-west-2
```

### Monitoring

View ECS logs:
```bash
aws logs tail /ecs/griffiths-crm-prod --follow --region eu-west-2
```

Check ECS service status:
```bash
aws ecs describe-services --cluster griffiths-crm-prod --services griffiths-crm-prod-api --region eu-west-2
```

## Known Issues

### Bun Lockfile in Docker

The `--frozen-lockfile` flag doesn't work reliably with bun in Docker/monorepo contexts. See [bun#12252](https://github.com/oven-sh/bun/issues/12252). The Dockerfile omits this flag intentionally.

### RDS SSL Connections

RDS PostgreSQL requires SSL by default. The `DATABASE_URL` must include `?sslmode=require`.
