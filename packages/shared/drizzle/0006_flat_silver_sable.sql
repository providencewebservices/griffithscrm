ALTER TABLE "quote_packages" DROP CONSTRAINT "quote_packages_service_id_services_id_fk";
--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_service_id_services_id_fk";
--> statement-breakpoint
ALTER TABLE "tenant_pricing_settings" ADD COLUMN "quote_validity_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_packages" DROP COLUMN "service_id";--> statement-breakpoint
ALTER TABLE "quotes" DROP COLUMN "service_id";