output "state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "S3 bucket ARN for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "backend_config" {
  description = "Backend configuration to use in main Terraform"
  value       = <<-EOT

    # Add this to your main terraform/main.tf:

    terraform {
      backend "s3" {
        bucket         = "${aws_s3_bucket.terraform_state.id}"
        key            = "prod/terraform.tfstate"
        region         = "eu-west-2"
        encrypt        = true
        dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
      }
    }

  EOT
}
