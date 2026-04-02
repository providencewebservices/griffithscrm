CREATE TABLE "inquiry_sundries" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"sundry_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiry_sundries" ADD CONSTRAINT "inquiry_sundries_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_sundries" ADD CONSTRAINT "inquiry_sundries_sundry_id_sundries_id_fk" FOREIGN KEY ("sundry_id") REFERENCES "public"."sundries"("id") ON DELETE set null ON UPDATE no action;