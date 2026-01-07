CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"street_number" text,
	"route" text,
	"locality" text,
	"administrative_area_level_1" text,
	"administrative_area_level_2" text,
	"postal_code" text,
	"postal_code_suffix" text,
	"country" text DEFAULT 'US' NOT NULL,
	"formatted_address" text NOT NULL,
	"place_id" text,
	"latitude" text,
	"longitude" text,
	"label" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_info" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"label" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "council_addresses" (
	"council_id" text NOT NULL,
	"address_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "council_addresses_council_id_address_id_pk" PRIMARY KEY("council_id","address_id")
);
--> statement-breakpoint
CREATE TABLE "council_contact_info" (
	"council_id" text NOT NULL,
	"contact_info_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "council_contact_info_council_id_contact_info_id_pk" PRIMARY KEY("council_id","contact_info_id")
);
--> statement-breakpoint
CREATE TABLE "councils" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"council_name" text NOT NULL,
	"cemetery_name" text,
	"department" text,
	"permit_required" boolean DEFAULT true NOT NULL,
	"permit_fee" numeric(10, 2),
	"foundation_spec" text,
	"max_headstone_height" text,
	"max_headstone_width" text,
	"approved_materials" text,
	"installation_rules" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"customer_id" text NOT NULL,
	"address_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_addresses_customer_id_address_id_pk" PRIMARY KEY("customer_id","address_id")
);
--> statement-breakpoint
CREATE TABLE "customer_contact_info" (
	"customer_id" text NOT NULL,
	"contact_info_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_contact_info_customer_id_contact_info_id_pk" PRIMARY KEY("customer_id","contact_info_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"tenant_id" text NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dimension_combo_values" (
	"id" text PRIMARY KEY NOT NULL,
	"combo_id" text NOT NULL,
	"product_component_id" text NOT NULL,
	"dimension_1" numeric(10, 2) NOT NULL,
	"dimension_2" numeric(10, 2) NOT NULL,
	"dimension_3" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dimension_combos" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text,
	"price_adjustment" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"name" text NOT NULL,
	"tags" text,
	"notes" text,
	"filename" text NOT NULL,
	"s3_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finishes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funeral_director_addresses" (
	"funeral_director_id" text NOT NULL,
	"address_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "funeral_director_addresses_funeral_director_id_address_id_pk" PRIMARY KEY("funeral_director_id","address_id")
);
--> statement-breakpoint
CREATE TABLE "funeral_director_contact_info" (
	"funeral_director_id" text NOT NULL,
	"contact_info_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "funeral_director_contact_info_funeral_director_id_contact_info_id_pk" PRIMARY KEY("funeral_director_id","contact_info_id")
);
--> statement-breakpoint
CREATE TABLE "funeral_directors" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_name" text NOT NULL,
	"trading_name" text,
	"branch_name" text,
	"website" text,
	"referral_arrangement" text DEFAULT 'none' NOT NULL,
	"commission_rate" numeric(5, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"category" text NOT NULL,
	"filename" text NOT NULL,
	"s3_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer,
	"notes" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_payment_schedule_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"job_id" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp,
	"paid_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"paid_at" timestamp,
	"payment_method" text,
	"external_payment_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"quote_id" text NOT NULL,
	"job_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lettering_colors" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lettering_costs" (
	"id" text PRIMARY KEY NOT NULL,
	"technique_id" text NOT NULL,
	"applies_to" text NOT NULL,
	"free_letters" integer DEFAULT 0 NOT NULL,
	"price_per_letter" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lettering_techniques" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"section_id" text NOT NULL,
	"supplier_id" text,
	"name" text NOT NULL,
	"image_url" text,
	"supplier_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memorial_site_addresses" (
	"memorial_site_id" text NOT NULL,
	"address_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memorial_site_addresses_memorial_site_id_address_id_pk" PRIMARY KEY("memorial_site_id","address_id")
);
--> statement-breakpoint
CREATE TABLE "memorial_site_contact_info" (
	"memorial_site_id" text NOT NULL,
	"contact_info_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memorial_site_contact_info_memorial_site_id_contact_info_id_pk" PRIMARY KEY("memorial_site_id","contact_info_id")
);
--> statement-breakpoint
CREATE TABLE "memorial_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"site_type" text NOT NULL,
	"denomination" text,
	"diocese" text,
	"parish" text,
	"churchyard_open" boolean,
	"faculty_required" boolean,
	"operator_name" text,
	"has_memorial_garden" boolean,
	"plaques_offered" boolean,
	"memorial_options" text,
	"preferred_supplier" boolean,
	"council_name" text,
	"cemetery_name" text,
	"department" text,
	"permit_required" boolean,
	"permit_fee" numeric(10, 2),
	"foundation_spec" text,
	"max_headstone_height" text,
	"max_headstone_width" text,
	"installation_rules" text,
	"memorial_regulations" text,
	"approved_materials" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "option_choices" (
	"id" text PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"name" text NOT NULL,
	"price_adjustment" numeric(10, 2) DEFAULT '0' NOT NULL,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_components" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"component_type" text NOT NULL,
	"name" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"category_id" text,
	"supplier_id" text,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"base_price" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_components" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"component_type" text NOT NULL,
	"material_id" text,
	"finish_id" text,
	"height" numeric(10, 2),
	"width" numeric(10, 2),
	"depth" numeric(10, 2),
	"quantity" integer DEFAULT 1 NOT NULL,
	"supplier_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"markup_percent" numeric(10, 2) DEFAULT '100' NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"material_name" text,
	"finish_name" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_lettering" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"technique_id" text,
	"color_id" text,
	"text" text,
	"letter_count" integer DEFAULT 0 NOT NULL,
	"applies_to" text,
	"supplier_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"markup_percent" numeric(10, 2) DEFAULT '100' NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"technique_name" text,
	"color_name" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_exempt" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_services" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"service_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"supplier_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"markup_percent" numeric(10, 2) DEFAULT '100' NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"service_name" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_sundries" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"sundry_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"supplier_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"markup_percent" numeric(10, 2) DEFAULT '100' NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"sundry_name" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"parent_quote_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"service_id" text,
	"customer_id" text,
	"product_id" text,
	"dimension_combo_id" text,
	"funeral_director_id" text,
	"council_id" text,
	"memorial_site_id" text,
	"quote_number" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text,
	"subtotal" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"notes" text,
	"internal_notes" text,
	"flower_holes" text,
	"proposed_inscription" text,
	"valid_until" timestamp,
	"access_token" text,
	"access_token_created_at" timestamp,
	"customer_feedback" text,
	"customer_feedback_at" timestamp,
	"customer_decision" text,
	"customer_decision_at" timestamp,
	"email_sent_at" timestamp,
	"email_sent_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"base_price" numeric(10, 2),
	"pricing_type" text DEFAULT 'fixed' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sundries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" text,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_addresses" (
	"supplier_id" text NOT NULL,
	"address_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_addresses_supplier_id_address_id_pk" PRIMARY KEY("supplier_id","address_id")
);
--> statement-breakpoint
CREATE TABLE "supplier_contact_info" (
	"supplier_id" text NOT NULL,
	"contact_info_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_contact_info_supplier_id_contact_info_id_pk" PRIMARY KEY("supplier_id","contact_info_id")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"business_name" text NOT NULL,
	"trading_name" text,
	"account_number" text,
	"website" text,
	"payment_terms" text,
	"default_lead_time_days" integer,
	"minimum_order_value" numeric(10, 2),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_pricing_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"default_markup_percent" numeric(10, 2) DEFAULT '100' NOT NULL,
	"vat_rate" numeric(5, 4) DEFAULT '0' NOT NULL,
	"default_deposit_percent" numeric(5, 2) DEFAULT '50' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_pricing_settings_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'tenant_user' NOT NULL,
	"tenant_id" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_addresses" ADD CONSTRAINT "council_addresses_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_addresses" ADD CONSTRAINT "council_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_contact_info" ADD CONSTRAINT "council_contact_info_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "council_contact_info" ADD CONSTRAINT "council_contact_info_contact_info_id_contact_info_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "councils" ADD CONSTRAINT "councils_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact_info" ADD CONSTRAINT "customer_contact_info_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contact_info" ADD CONSTRAINT "customer_contact_info_contact_info_id_contact_info_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_combo_values" ADD CONSTRAINT "dimension_combo_values_combo_id_dimension_combos_id_fk" FOREIGN KEY ("combo_id") REFERENCES "public"."dimension_combos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_combo_values" ADD CONSTRAINT "dimension_combo_values_product_component_id_product_components_id_fk" FOREIGN KEY ("product_component_id") REFERENCES "public"."product_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dimension_combos" ADD CONSTRAINT "dimension_combos_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finishes" ADD CONSTRAINT "finishes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funeral_director_addresses" ADD CONSTRAINT "funeral_director_addresses_funeral_director_id_funeral_directors_id_fk" FOREIGN KEY ("funeral_director_id") REFERENCES "public"."funeral_directors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funeral_director_addresses" ADD CONSTRAINT "funeral_director_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funeral_director_contact_info" ADD CONSTRAINT "funeral_director_contact_info_funeral_director_id_funeral_directors_id_fk" FOREIGN KEY ("funeral_director_id") REFERENCES "public"."funeral_directors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funeral_director_contact_info" ADD CONSTRAINT "funeral_director_contact_info_contact_info_id_contact_info_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funeral_directors" ADD CONSTRAINT "funeral_directors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attachments" ADD CONSTRAINT "job_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_payment_schedule_items" ADD CONSTRAINT "job_payment_schedule_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_payment_schedule_items" ADD CONSTRAINT "job_payment_schedule_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lettering_colors" ADD CONSTRAINT "lettering_colors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lettering_costs" ADD CONSTRAINT "lettering_costs_technique_id_lettering_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."lettering_techniques"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lettering_techniques" ADD CONSTRAINT "lettering_techniques_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_sections" ADD CONSTRAINT "material_sections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_section_id_material_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."material_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_site_addresses" ADD CONSTRAINT "memorial_site_addresses_memorial_site_id_memorial_sites_id_fk" FOREIGN KEY ("memorial_site_id") REFERENCES "public"."memorial_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_site_addresses" ADD CONSTRAINT "memorial_site_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_site_contact_info" ADD CONSTRAINT "memorial_site_contact_info_memorial_site_id_memorial_sites_id_fk" FOREIGN KEY ("memorial_site_id") REFERENCES "public"."memorial_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_site_contact_info" ADD CONSTRAINT "memorial_site_contact_info_contact_info_id_contact_info_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorial_sites" ADD CONSTRAINT "memorial_sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "option_choices" ADD CONSTRAINT "option_choices_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_components" ADD CONSTRAINT "quote_components_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_components" ADD CONSTRAINT "quote_components_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_components" ADD CONSTRAINT "quote_components_finish_id_finishes_id_fk" FOREIGN KEY ("finish_id") REFERENCES "public"."finishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD CONSTRAINT "quote_lettering_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD CONSTRAINT "quote_lettering_technique_id_lettering_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."lettering_techniques"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_lettering" ADD CONSTRAINT "quote_lettering_color_id_lettering_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."lettering_colors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_services" ADD CONSTRAINT "quote_services_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_services" ADD CONSTRAINT "quote_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sundries" ADD CONSTRAINT "quote_sundries_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_sundries" ADD CONSTRAINT "quote_sundries_sundry_id_sundries_id_fk" FOREIGN KEY ("sundry_id") REFERENCES "public"."sundries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_dimension_combo_id_dimension_combos_id_fk" FOREIGN KEY ("dimension_combo_id") REFERENCES "public"."dimension_combos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_funeral_director_id_funeral_directors_id_fk" FOREIGN KEY ("funeral_director_id") REFERENCES "public"."funeral_directors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_memorial_site_id_memorial_sites_id_fk" FOREIGN KEY ("memorial_site_id") REFERENCES "public"."memorial_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sundries" ADD CONSTRAINT "sundries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sundries" ADD CONSTRAINT "sundries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_addresses" ADD CONSTRAINT "supplier_addresses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contact_info" ADD CONSTRAINT "supplier_contact_info_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_contact_info" ADD CONSTRAINT "supplier_contact_info_contact_info_id_contact_info_id_fk" FOREIGN KEY ("contact_info_id") REFERENCES "public"."contact_info"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_pricing_settings" ADD CONSTRAINT "tenant_pricing_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;