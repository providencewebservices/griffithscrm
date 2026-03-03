CREATE TABLE "fonts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"s3_key" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD COLUMN "font_id" text;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD COLUMN "font_name" text;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD COLUMN "font_s3_key" text;--> statement-breakpoint
ALTER TABLE "fonts" ADD CONSTRAINT "fonts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD CONSTRAINT "quote_lettering_font_id_fonts_id_fk" FOREIGN KEY ("font_id") REFERENCES "public"."fonts"("id") ON DELETE set null ON UPDATE no action;