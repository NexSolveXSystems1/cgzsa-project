#!/usr/bin/env bash
#
# Restore a backup produced by scripts/backup.sh.
#
# This script exists so that the restore is a rehearsed procedure rather than
# something invented under pressure. Run it against a scratch database at least
# once a year and record how long it took: that number is your recovery time,
# and it is the only honest measure of whether the backups work.
#
# Usage:
#   ./scripts/restore.sh ./backups/2026-08-28T02-00-00Z
#
#   RESTORE_URL=postgresql://... ./scripts/restore.sh <dir>    # restore elsewhere
#
# By default it refuses to write to the DATABASE_URL in your environment, so a
# rehearsal cannot destroy production by accident. Pass RESTORE_URL explicitly.
#
set -euo pipefail

SRC="${1:-}"
if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "Usage: $0 <backup-directory>" >&2
  echo "Available:" >&2
  ls -1 "${BACKUP_DIR:-./backups}" 2>/dev/null | sed 's/^/  /' >&2 || echo "  (none found)" >&2
  exit 1
fi

TARGET_URL="${RESTORE_URL:-}"
if [ -z "$TARGET_URL" ]; then
  echo "RESTORE_URL is not set." >&2
  echo >&2
  echo "This is deliberate. Restoring into the live database is almost never what" >&2
  echo "you want during a rehearsal, so the target must be named explicitly:" >&2
  echo >&2
  echo "  createdb cgzsa_restore_test" >&2
  echo "  RESTORE_URL=postgresql://user:pass@localhost:5432/cgzsa_restore_test \\" >&2
  echo "    $0 $SRC" >&2
  echo >&2
  echo "For a real recovery, point RESTORE_URL at the production database and" >&2
  echo "make sure the application is stopped first." >&2
  exit 1
fi

echo "→ restoring from ${SRC}"
[ -f "${SRC}/MANIFEST.txt" ] && sed 's/^/  /' "${SRC}/MANIFEST.txt"

# ── verify before trusting ──────────────────────────────────────────────────
if [ -f "${SRC}/SHA256SUMS" ]; then
  echo "→ verifying checksums"
  ( cd "$SRC" && sha256sum -c SHA256SUMS --quiet ) && echo "  intact"
else
  echo "! no SHA256SUMS in this backup — cannot verify integrity" >&2
fi

# ── database ────────────────────────────────────────────────────────────────
echo "→ restoring database into ${TARGET_URL%%\?*}"
echo "  (existing objects in the target will be dropped)"
pg_restore --clean --if-exists --no-owner --no-privileges \
           --dbname="$TARGET_URL" "${SRC}/database.dump"

# ── uploaded files ──────────────────────────────────────────────────────────
if [ -f "${SRC}/storage.tar.gz" ]; then
  DEST="${RESTORE_STORAGE_PATH:-./storage-restored}"
  echo "→ restoring storage into ${DEST}"
  mkdir -p "$DEST"
  tar -xzf "${SRC}/storage.tar.gz" -C "$DEST" --strip-components=1
  echo "  $(find "$DEST" -type f | wc -l) files"
else
  echo "! this backup has no storage archive" >&2
fi

# ── prove it ────────────────────────────────────────────────────────────────
echo "→ checking what came back"
psql "$TARGET_URL" -tA <<'SQL' | sed 's/^/  /'
select 'tables:      ' || count(*) from information_schema.tables where table_schema = 'public';
select 'users:       ' || count(*) from users;
select 'pages:       ' || count(*) from pages;
select 'articles:    ' || count(*) from articles;
select 'media:       ' || count(*) from media_assets;
select 'enquiries:   ' || count(*) from contact_messages;
SQL

echo
echo "✓ restore complete."
echo
echo "  A restore is not verified until somebody has looked at the result."
echo "  Point a copy of the app at this database, sign in, open a page, and"
echo "  confirm an uploaded image still renders. Record how long all of that"
echo "  took — that is your real recovery time."
