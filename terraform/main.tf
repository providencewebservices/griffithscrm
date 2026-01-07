terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.27"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "griffiths-crm-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "griffiths-crm-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "griffiths-crm"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Provider for CloudFront ACM certificate (must be in us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "griffiths-crm"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name = "griffiths-crm-${var.environment}"

  tags = {
    Project     = "griffiths-crm"
    Environment = var.environment
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = false
}
