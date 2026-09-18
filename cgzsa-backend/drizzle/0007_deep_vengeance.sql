CREATE TABLE "content_blocks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"page" text NOT NULL,
	"slot" text NOT NULL,
	"label" text NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cta_label" text,
	"cta_href" text,
	"image_id" text,
	"order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_image_id_media_assets_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_page_slot_idx" ON "content_blocks" USING btree ("page","slot");--> statement-breakpoint
CREATE INDEX "content_blocks_page_status_idx" ON "content_blocks" USING btree ("page","status","order");