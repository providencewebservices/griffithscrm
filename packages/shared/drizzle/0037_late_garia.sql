ALTER TABLE "jobs" ADD COLUMN "review_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "review_completed_by" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "review_outcome" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_review_completed_by_users_id_fk" FOREIGN KEY ("review_completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;