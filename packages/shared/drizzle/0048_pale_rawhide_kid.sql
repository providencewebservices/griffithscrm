ALTER TABLE "inquiry_products" ADD COLUMN "customer_photo_url" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD COLUMN "customer_photo_filename" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD COLUMN "customer_photo_content_type" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "requires_customer_photo_upload" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "customer_photo_upload_instructions" text;