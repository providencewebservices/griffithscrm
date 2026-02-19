CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assignee_id" text,
	"created_by_id" text NOT NULL,
	"due_date" timestamp,
	"entity_type" text,
	"entity_id" text,
	"worksheet_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"completed_by_id" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worksheets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"assignee_id" text,
	"created_by_id" text NOT NULL,
	"date" timestamp,
	"notes" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_worksheet_id_worksheets_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_tenant_status_idx" ON "tasks" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "tasks_tenant_assignee_idx" ON "tasks" USING btree ("tenant_id","assignee_id");--> statement-breakpoint
CREATE INDEX "tasks_tenant_due_date_idx" ON "tasks" USING btree ("tenant_id","due_date");--> statement-breakpoint
CREATE INDEX "tasks_entity_idx" ON "tasks" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "tasks_worksheet_idx" ON "tasks" USING btree ("worksheet_id");--> statement-breakpoint
CREATE INDEX "worksheets_tenant_assignee_idx" ON "worksheets" USING btree ("tenant_id","assignee_id");--> statement-breakpoint
CREATE INDEX "worksheets_tenant_date_idx" ON "worksheets" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "worksheets_tenant_status_idx" ON "worksheets" USING btree ("tenant_id","status");