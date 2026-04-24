# Staging keeps the existing default-account deployment stable.
# Sensitive values are intentionally not committed here; provide them through
# TF_VAR_* environment variables or an ignored local tfvars file.

aws_region  = "eu-west-2"
environment = "prod"

web_domain   = "griffiths.uwchlanventures.com"
api_domain   = "griffiths-api.uwchlanventures.com"
media_domain = ""

route53_zone_id = ""

api_cpu           = 256
api_memory        = 512
api_desired_count = 1

s3_documents_bucket_name    = ""
s3_public_media_bucket_name = ""

ses_from_email = "noreply@uwchlanventures.com"
ses_region     = "us-east-2"

google_client_id = "845721380642-ig33js985rujk5lssmc4ol90ba99722p.apps.googleusercontent.com"
google_pubsub_topic = "projects/memorial-crm-483611/topics/gmail-push"

vpc_cidr = "10.0.0.0/16"
