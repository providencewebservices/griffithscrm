#!/bin/bash

# Create the S3 bucket
awslocal s3 mb s3://griffiths-crm-uploads

# Configure CORS for browser uploads
awslocal s3api put-bucket-cors --bucket griffiths-crm-uploads --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }]
}'

echo "S3 bucket 'griffiths-crm-uploads' created with CORS configuration"
