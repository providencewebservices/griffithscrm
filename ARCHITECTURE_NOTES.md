CRM Stack Architecture for Claude Code
Project Overview
Building a full-stack CRM application using Bun's native workspace feature for monorepo management. The application will be deployed on AWS infrastructure managed with Terraform.
Technology Stack
Frontend (apps/web)

Vite - Build tool and dev server
React with TypeScript
React Router - Client-side routing
shadcn/ui - UI component library
Tailwind CSS - Styling
TanStack Query - Server state management
Hono RPC Client - Type-safe API calls to backend
Better Auth React Client - Authentication hooks and utilities

Backend (apps/api)

Hono - Web framework for API
Bun - JavaScript runtime (dev and production)
Better Auth - Authentication library
Drizzle ORM - Database ORM
Zod - Schema validation

Monorepo & Package Management

Bun Workspaces - Native monorepo support (no Nx, no Lerna, no Turborepo)

Database

PostgreSQL - Relational database (AWS RDS in production)

Infrastructure & Deployment

Terraform - Infrastructure as Code for all AWS resources
AWS ECS Fargate - Container orchestration for backend
AWS S3 + CloudFront - Static hosting and CDN for frontend
AWS RDS PostgreSQL - Managed database
AWS ECR - Container registry
AWS Application Load Balancer - Traffic routing
AWS VPC - Networking
AWS Secrets Manager - Secret management
Docker - Containerization for backend

Monitoring (Existing)

Prometheus - Metrics collection
Grafana - Metrics visualization

Architecture Overview

Bun workspace monorepo with separate frontend and backend apps
Frontend: Static React SPA deployed to S3/CloudFront
Backend: Containerized Bun/Hono API running on ECS Fargate
Database: RDS PostgreSQL in private subnet
End-to-end type safety via Hono RPC (backend exports types, frontend consumes them)
Infrastructure managed entirely through Terraform
Authentication handled by Better Auth with cookie-based sessions
