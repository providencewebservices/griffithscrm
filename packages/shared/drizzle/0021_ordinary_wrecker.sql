ALTER TABLE "email_entity_links" ADD COLUMN "link_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_info_type_value_idx" ON "contact_info" USING btree ("type","value");--> statement-breakpoint
CREATE UNIQUE INDEX "email_entity_links_unique_idx" ON "email_entity_links" USING btree ("thread_id","entity_type","entity_id");