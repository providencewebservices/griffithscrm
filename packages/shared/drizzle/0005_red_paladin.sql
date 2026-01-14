CREATE TABLE "quote_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"package_number" text NOT NULL,
	"customer_id" text,
	"service_id" text,
	"funeral_director_id" text,
	"council_id" text,
	"memorial_site_id" text,
	"quote_type" text DEFAULT 'new_memorial' NOT NULL,
	"source" text,
	"existing_memorial_description" text,
	"related_job_id" text,
	"proposed_inscription" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"internal_notes" text,
	"valid_until" timestamp,
	"access_token" text,
	"access_token_created_at" timestamp,
	"email_sent_at" timestamp,
	"email_sent_count" integer DEFAULT 0 NOT NULL,
	"customer_feedback" text,
	"customer_feedback_at" timestamp,
	"accepted_option_id" text,
	"customer_decision_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quote_packages_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "package_id" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "option_label" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "option_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_funeral_director_id_funeral_directors_id_fk" FOREIGN KEY ("funeral_director_id") REFERENCES "public"."funeral_directors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_packages" ADD CONSTRAINT "quote_packages_memorial_site_id_memorial_sites_id_fk" FOREIGN KEY ("memorial_site_id") REFERENCES "public"."memorial_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_package_id_quote_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."quote_packages"("id") ON DELETE cascade ON UPDATE no action;