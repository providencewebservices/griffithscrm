bucket         = "griffiths-crm-terraform-state"
key            = "prod/terraform.tfstate"
region         = "eu-west-2"
encrypt        = true
dynamodb_table = "griffiths-crm-terraform-locks"
