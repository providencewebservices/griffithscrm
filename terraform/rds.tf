# RDS PostgreSQL - Cost-conscious: Single-AZ, t4g.micro
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "7.0.1"

  identifier = local.name

  # PostgreSQL
  engine               = "postgres"
  engine_version       = "16"
  family               = "postgres16"
  major_engine_version = "16"

  # Instance - Cost-conscious
  instance_class        = var.db_instance_class
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100 # Allow autoscaling up to 100GB

  # Database
  db_name  = var.db_name
  username = "griffiths_admin"
  port     = 5432

  # Use random password
  manage_master_user_password = false
  password                    = random_password.db_password.result

  # Single-AZ for cost savings
  multi_az = false

  # Networking
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Maintenance & Backup
  maintenance_window      = "Mon:00:00-Mon:03:00"
  backup_window           = "03:00-06:00"
  backup_retention_period = 7

  # Performance Insights (free tier for 7 days retention)
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 0 # Disable enhanced monitoring (cost savings)

  # Encryption
  storage_encrypted = true

  # Deletion protection (enable in production)
  deletion_protection = var.environment == "prod"

  # Skip final snapshot for non-prod
  skip_final_snapshot              = var.environment != "prod"
  final_snapshot_identifier_prefix = "${local.name}-final"

  # Parameter group
  create_db_parameter_group = true
  parameters = [
    {
      name  = "log_connections"
      value = "1"
    }
  ]

  tags = local.tags
}

# Store database credentials in SSM Parameter Store (free)
resource "aws_ssm_parameter" "db_host" {
  name        = "/${local.name}/database/host"
  description = "Database host"
  type        = "String"
  value       = module.rds.db_instance_endpoint

  tags = local.tags
}

resource "aws_ssm_parameter" "db_name" {
  name        = "/${local.name}/database/name"
  description = "Database name"
  type        = "String"
  value       = var.db_name

  tags = local.tags
}

resource "aws_ssm_parameter" "db_username" {
  name        = "/${local.name}/database/username"
  description = "Database username"
  type        = "String"
  value       = "griffiths_admin"

  tags = local.tags
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/${local.name}/database/password"
  description = "Database password"
  type        = "SecureString"
  value       = random_password.db_password.result

  tags = local.tags
}

# Generate DATABASE_URL for the application
resource "aws_ssm_parameter" "database_url" {
  name        = "/${local.name}/database/url"
  description = "Full database connection URL"
  type        = "SecureString"
  value       = "postgresql://griffiths_admin:${random_password.db_password.result}@${module.rds.db_instance_endpoint}/${var.db_name}"

  tags = local.tags
}
