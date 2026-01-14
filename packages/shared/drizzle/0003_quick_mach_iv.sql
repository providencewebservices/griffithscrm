CREATE TABLE "line_item_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"default_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"visible_to_customer" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD COLUMN "visible_to_customer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "line_item_presets" ADD CONSTRAINT "line_item_presets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;