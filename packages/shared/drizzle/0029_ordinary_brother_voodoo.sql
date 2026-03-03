CREATE TABLE "memorial_worksheets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"deceased_name" text,
	"cemetery_churchyard" text,
	"location" text,
	"existing_description" text,
	"requirements" text,
	"inscription" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memorial_worksheets_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
ALTER TABLE "memorial_worksheets" ADD CONSTRAINT "memorial_worksheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_worksheets" ADD CONSTRAINT "memorial_worksheets_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;