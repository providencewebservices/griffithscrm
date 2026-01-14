ALTER TABLE "quotes" ADD COLUMN "quote_type" text DEFAULT 'new_memorial' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "existing_memorial_description" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "related_job_id" text;