# Production deploys into the covalt AWS account.
# Sensitive values are intentionally not committed here; provide them through
# TF_VAR_* environment variables or an ignored local tfvars file.

aws_region  = "eu-west-2"
environment = "production"

web_domain   = "crm.griffithsmemorials.com"
api_domain   = "api.griffithsmemorials.com"
media_domain = "media.griffithsmemorials.com"

route53_zone_id = ""

api_cpu           = 256
api_memory        = 512
api_desired_count = 1

s3_documents_bucket_name    = "griffiths-crm-production-documents"
s3_public_media_bucket_name = "griffiths-crm-production-public-media"

ses_from_email = "noreply@griffithsmemorials.com"
ses_region     = "us-east-2"

google_client_id = "845721380642-ig33js985rujk5lssmc4ol90ba99722p.apps.googleusercontent.com"
google_pubsub_topic = "projects/memorial-crm-483611/topics/gmail-push"

vpc_cidr = "10.0.0.0/16"
