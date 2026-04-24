bucket         = "griffiths-crm-production-terraform-state"
key            = "production/terraform.tfstate"
region         = "eu-west-2"
encrypt        = true
dynamodb_table = "griffiths-crm-production-terraform-locks"
