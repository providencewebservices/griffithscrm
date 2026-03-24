CREATE TABLE "brochure_products" (
	"id" text PRIMARY KEY NOT NULL,
	"brochure_id" text NOT NULL,
	"product_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_interested" boolean DEFAULT false NOT NULL,
	"interested_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brochures" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_id" text,
	"created_by_id" text,
	"message" text,
	"access_token" text,
	"expires_at" timestamp NOT NULL,
	"ready_to_discuss_at" timestamp,
	"archived_at" timestamp,
	"email_sent_at" timestamp,
	"email_sent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brochures_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
ALTER TABLE "brochure_products" ADD CONSTRAINT "brochure_products_brochure_id_brochures_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."brochures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brochure_products" ADD CONSTRAINT "brochure_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brochures" ADD CONSTRAINT "brochures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brochures" ADD CONSTRAINT "brochures_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brochures" ADD CONSTRAINT "brochures_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brochures_active_per_customer" ON "brochures" USING btree ("tenant_id","customer_id") WHERE archived_at IS NULL;