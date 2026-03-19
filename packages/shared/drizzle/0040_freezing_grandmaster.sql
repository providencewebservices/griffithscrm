CREATE TABLE "job_forms" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"fee" numeric(10, 2),
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"reference_number" text,
	"notes" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_forms" ADD CONSTRAINT "job_forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_forms" ADD CONSTRAINT "job_forms_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jf_tenant_job_idx" ON "job_forms" USING btree ("tenant_id","job_id");