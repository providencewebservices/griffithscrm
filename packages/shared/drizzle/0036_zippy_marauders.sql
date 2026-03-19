ALTER TABLE "jobs" ADD COLUMN "invoiced_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "account_status" text DEFAULT 'not_invoiced';