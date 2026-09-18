ALTER TABLE "site_settings" ADD COLUMN "home_hero_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_intro_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_waste_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_public_space_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_water_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_volunteer_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_partner_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "home_donate_image_id" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_hero_image_id_media_assets_id_fk" FOREIGN KEY ("home_hero_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_intro_image_id_media_assets_id_fk" FOREIGN KEY ("home_intro_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_waste_image_id_media_assets_id_fk" FOREIGN KEY ("home_waste_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_public_space_image_id_media_assets_id_fk" FOREIGN KEY ("home_public_space_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_water_image_id_media_assets_id_fk" FOREIGN KEY ("home_water_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_volunteer_image_id_media_assets_id_fk" FOREIGN KEY ("home_volunteer_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_partner_image_id_media_assets_id_fk" FOREIGN KEY ("home_partner_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_home_donate_image_id_media_assets_id_fk" FOREIGN KEY ("home_donate_image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;