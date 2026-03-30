ALTER TABLE "brochures" ADD COLUMN "inquiry_id" text;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD COLUMN "inquiry_id" text;--> statement-breakpoint
ALTER TABLE "brochures" ADD CONSTRAINT "brochures_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;