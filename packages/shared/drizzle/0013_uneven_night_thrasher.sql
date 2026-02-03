ALTER TABLE "customers" ADD COLUMN "preferred_contact_method" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "preferred_contact_time" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "do_not_call" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "do_not_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "do_not_mail" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "communication_notes" text;