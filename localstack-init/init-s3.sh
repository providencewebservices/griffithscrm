#!/bin/bash

# Create the private documents bucket
awslocal s3 mb s3://griffiths-crm-uploads

# Create the public media bucket
awslocal s3 mb s3://griffiths-crm-public-media

# Configure CORS for browser uploads
awslocal s3api put-bucket-cors --bucket griffiths-crm-uploads --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }]
}'

awslocal s3api put-bucket-cors --bucket griffiths-crm-public-media --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }]
}'

echo "S3 buckets 'griffiths-crm-uploads' and 'griffiths-crm-public-media' created with CORS configuration"
