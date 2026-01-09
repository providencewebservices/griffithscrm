# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled" # Cost savings - enable if needed for debugging
  }

  tags = local.tags
}

# ECS Cluster Capacity Providers
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE_SPOT" # Cost savings - use spot for non-critical workloads
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name}"
  retention_in_days = 14 # Cost savings - shorter retention

  tags = local.tags
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution" {
  name = "${local.name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow task execution role to read SSM parameters
resource "aws_iam_role_policy" "ecs_task_execution_ssm" {
  name = "${local.name}-ecs-task-execution-ssm"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${local.name}/*"
      }
    ]
  })
}

# ECS Task Role (for the running container)
resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

# Allow task role to access S3 documents bucket
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${local.name}-ecs-task-s3"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.documents.arn,
          "${aws_s3_bucket.documents.arn}/*"
        ]
      }
    ]
  })
}

# Allow task role to use ECS Exec (SSM Session Manager)
# Required for shell access to running containers for bootstrap/debugging
# Reference: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
resource "aws_iam_role_policy" "ecs_task_exec_command" {
  name = "${local.name}-ecs-task-exec-command"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

# Allow task role to send emails via SES (us-east-2)
resource "aws_iam_role_policy" "ecs_task_ses" {
  name = "${local.name}-ecs-task-ses"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_email
          }
        }
      }
    ]
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${aws_ecr_repository.api.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        },
        {
          name  = "BETTER_AUTH_URL"
          value = "https://${var.api_domain}"
        },
        {
          name  = "CORS_ORIGIN"
          value = "https://${var.web_domain}"
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.documents.id
        },
        {
          name  = "SES_REGION"
          value = var.ses_region
        },
        {
          name  = "EMAIL_FROM"
          value = var.ses_from_email
        }
      ]

      secrets = concat([
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.database_url.arn
        },
        {
          name      = "BETTER_AUTH_SECRET"
          valueFrom = aws_ssm_parameter.better_auth_secret.arn
        }
      ],
      var.google_client_id != "" ? [
        {
          name      = "GOOGLE_CLIENT_ID"
          valueFrom = aws_ssm_parameter.google_client_id[0].arn
        },
        {
          name      = "GOOGLE_CLIENT_SECRET"
          valueFrom = aws_ssm_parameter.google_client_secret[0].arn
        }
      ] : [],
      var.microsoft_client_id != "" ? [
        {
          name      = "MICROSOFT_CLIENT_ID"
          valueFrom = aws_ssm_parameter.microsoft_client_id[0].arn
        },
        {
          name      = "MICROSOFT_CLIENT_SECRET"
          valueFrom = aws_ssm_parameter.microsoft_client_secret[0].arn
        }
      ] : [])

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = local.tags
}

# Store Better Auth Secret in SSM
resource "aws_ssm_parameter" "better_auth_secret" {
  name        = "/${local.name}/app/better-auth-secret"
  description = "Better Auth secret key"
  type        = "SecureString"
  value       = var.better_auth_secret

  tags = local.tags
}

# OAuth - Google (optional)
resource "aws_ssm_parameter" "google_client_id" {
  count       = var.google_client_id != "" ? 1 : 0
  name        = "/${local.name}/app/google-client-id"
  description = "Google OAuth client ID"
  type        = "String"
  value       = var.google_client_id

  tags = local.tags
}

resource "aws_ssm_parameter" "google_client_secret" {
  count       = var.google_client_secret != "" ? 1 : 0
  name        = "/${local.name}/app/google-client-secret"
  description = "Google OAuth client secret"
  type        = "SecureString"
  value       = var.google_client_secret

  tags = local.tags
}

# OAuth - Microsoft (optional)
resource "aws_ssm_parameter" "microsoft_client_id" {
  count       = var.microsoft_client_id != "" ? 1 : 0
  name        = "/${local.name}/app/microsoft-client-id"
  description = "Microsoft OAuth client ID"
  type        = "String"
  value       = var.microsoft_client_id

  tags = local.tags
}

resource "aws_ssm_parameter" "microsoft_client_secret" {
  count       = var.microsoft_client_secret != "" ? 1 : 0
  name        = "/${local.name}/app/microsoft-client-secret"
  description = "Microsoft OAuth client secret"
  type        = "SecureString"
  value       = var.microsoft_client_secret

  tags = local.tags
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  # Enable ECS Exec for shell access to containers (bootstrap admin, debugging)
  # Reference: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec.html
  enable_execute_command = true

  network_configuration {
    subnets          = module.vpc.public_subnets
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true # Required for Fargate in public subnet
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_lb_listener.https]

  tags = local.tags
}
