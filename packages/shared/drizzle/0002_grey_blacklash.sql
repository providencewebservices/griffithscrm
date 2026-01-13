ALTER TABLE "lettering_costs" ADD COLUMN "color_id" text;--> statement-breakpoint
ALTER TABLE "lettering_costs" ADD CONSTRAINT "lettering_costs_color_id_lettering_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."lettering_colors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lettering_colors" DROP COLUMN "price";