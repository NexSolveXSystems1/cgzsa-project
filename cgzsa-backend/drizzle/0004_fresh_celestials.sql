ALTER TABLE "pages" ADD COLUMN "image_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "image_id" text;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_image_id_media_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_image_id_media_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;