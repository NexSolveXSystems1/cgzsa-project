ALTER TABLE "site_settings" ADD COLUMN "programs_page_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "projects_page_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "news_page_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "events_page_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "contact_page_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_programs_page_image_id_media_assets_id_fk" FOREIGN KEY ("programs_page_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_projects_page_image_id_media_assets_id_fk" FOREIGN KEY ("projects_page_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_news_page_image_id_media_assets_id_fk" FOREIGN KEY ("news_page_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_events_page_image_id_media_assets_id_fk" FOREIGN KEY ("events_page_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_contact_page_image_id_media_assets_id_fk" FOREIGN KEY ("contact_page_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;