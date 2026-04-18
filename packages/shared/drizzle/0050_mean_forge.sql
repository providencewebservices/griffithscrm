ALTER TABLE "inquiries" ADD COLUMN "proposed_inscription" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD COLUMN "material_id" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD COLUMN "flower_holes" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD COLUMN "flower_top_color" text;--> statement-breakpoint
ALTER TABLE "inquiry_products" ADD CONSTRAINT "inquiry_products_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE set null ON UPDATE no action;