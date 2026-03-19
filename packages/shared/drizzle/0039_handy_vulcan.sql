CREATE TABLE "job_workflow_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"workflow_step_id" text,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"assignee_id" text,
	"category" text NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"completed_by" text,
	"task_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_workflow_tasks" ADD CONSTRAINT "job_workflow_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workflow_tasks" ADD CONSTRAINT "job_workflow_tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workflow_tasks" ADD CONSTRAINT "job_workflow_tasks_workflow_step_id_workflow_steps_id_fk" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workflow_tasks" ADD CONSTRAINT "job_workflow_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_workflow_tasks" ADD CONSTRAINT "job_workflow_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jwt_tenant_job_idx" ON "job_workflow_tasks" USING btree ("tenant_id","job_id");