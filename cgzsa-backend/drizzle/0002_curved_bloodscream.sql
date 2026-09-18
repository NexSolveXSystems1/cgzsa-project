-- ─────────────────────────────────────────────────────────────────────────────
-- Dropping four tables that the application never read or wrote:
--   subscribers, project_partners, project_documents, media_albums
--
-- They were created by the first migration and no code referenced them, which
-- misleads anyone reading the schema about what the system does. Drizzle
-- generates DROP TABLE ... CASCADE, which would also remove dependent objects
-- and any rows silently.
--
-- The guard below refuses the migration if any of them turns out to hold data —
-- for instance if a newsletter feature was added out-of-band after this audit.
-- A migration that destroys unexpected data is worse than one that stops and
-- asks. If it stops, look at the rows, decide what to keep, and remove this
-- block deliberately.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  n bigint;
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscribers','project_partners','project_documents','media_albums'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION
          'Refusing to drop "%" — it holds % row(s). These tables were unused when the audit ran; something has written to this one since. Review the data before removing this guard.', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "media_albums" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_partners" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscribers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "media_albums" CASCADE;--> statement-breakpoint
DROP TABLE "project_documents" CASCADE;--> statement-breakpoint
DROP TABLE "project_partners" CASCADE;--> statement-breakpoint
DROP TABLE "subscribers" CASCADE;--> statement-breakpoint
-- IF EXISTS, because the CASCADE on "media_albums" above has already removed
-- this constraint. Drizzle generated the two statements in an order where the
-- second always fails, which rolls the whole migration back — the drops appear
-- to run, the notices appear in the log, and nothing is actually committed.
ALTER TABLE "media_assets" DROP CONSTRAINT IF EXISTS "media_assets_album_id_media_albums_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_meta_page_idx" ON "seo_meta" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_meta_article_idx" ON "seo_meta" USING btree ("article_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seo_meta_program_idx" ON "seo_meta" USING btree ("program_id");--> statement-breakpoint
ALTER TABLE "media_assets" DROP COLUMN "album_id";