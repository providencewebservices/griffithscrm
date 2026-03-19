ALTER TABLE "jobs" ADD COLUMN "production_method" text;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD COLUMN "production_method" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "production_method" text;