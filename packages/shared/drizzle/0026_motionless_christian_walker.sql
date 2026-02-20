CREATE TABLE "payment_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"milestone_id" text NOT NULL,
	"job_id" text NOT NULL,
	"order_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status_code" integer,
	"message" text,
	"cross_reference" text,
	"card_last_four" text,
	"card_type" text,
	"three_d_secure_result" text,
	"raw_response" jsonb,
	"hash_verified" boolean,
	"status" text DEFAULT 'pending' NOT NULL,
	"server_result_received_at" timestamp,
	"callback_received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "takepayments_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"merchant_id" text NOT NULL,
	"gateway_password_encrypted" text NOT NULL,
	"pre_shared_key_encrypted" text NOT NULL,
	"hash_method" text DEFAULT 'SHA1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "takepayments_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "job_payment_schedule_items" ADD COLUMN "takepayments_cross_reference" text;--> statement-breakpoint
ALTER TABLE "job_payment_schedule_items" ADD COLUMN "takepayments_status_code" integer;--> statement-breakpoint
ALTER TABLE "job_payment_schedule_items" ADD COLUMN "card_last_four" text;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_milestone_id_job_payment_schedule_items_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."job_payment_schedule_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "takepayments_settings" ADD CONSTRAINT "takepayments_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_attempts_order_id_idx" ON "payment_attempts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_milestone_id_idx" ON "payment_attempts" USING btree ("milestone_id");