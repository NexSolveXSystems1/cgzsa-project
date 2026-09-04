#!/usr/bin/env bash
#
# Nightly backup: the database and the uploaded files.
#
# The audit found that backups existed only as a recommendation in the README.
# Two things must be captured, and losing either is unrecoverable:
#
#   the database    all content, chat transcripts, contact enquiries, users
#   the storage dir every uploaded document and photograph
#
# A dump sitting on the same machine as the database is not a backup — it dies
# with the disk, the ransomware, or the "docker compose down -v" typed at 2am.
# Set BACKUP_REMOTE to push the finished archive off the machine.
#
# Usage:
#   ./scripts/backup.sh                     # write to ./backups
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh
#
# Environment:
#   DATABASE_URL     required
#   STORAGE_PATH     defaults to ./storage
#   BACKUP_DIR       defaults to ./backups
#   BACKUP_KEEP      how many daily backups to retain locally, default 14
#   BACKUP_REMOTE    optional rclone/rsync destination, e.g. "b2:cgzsa-backups"
#
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STORAGE_PATH="${STORAGE_PATH:-./storage}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
TARGET="${BACKUP_DIR}/${STAMP}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Load your .env first, or pass it inline." >&2
  exit 1
fi

mkdir -p "$TARGET"
echo "→ backing up to ${TARGET}"

# ── database ────────────────────────────────────────────────────────────────
# Custom format (-Fc): compressed, and restorable selectively with pg_restore.
echo "  database"
pg_dump --format=custom --no-owner --no-privileges \
        --file="${TARGET}/database.dump" "$DATABASE_URL"

# ── uploaded files ──────────────────────────────────────────────────────────
if [ -d "$STORAGE_PATH" ]; then
  echo "  storage ($(du -sh "$STORAGE_PATH" | cut -f1))"
  tar -czf "${TARGET}/storage.tar.gz" -C "$(dirname "$STORAGE_PATH")" "$(basename "$STORAGE_PATH")"
else
  echo "  storage directory not found at ${STORAGE_PATH} — skipping" >&2
fi

# ── a record of what this backup is ─────────────────────────────────────────
# So whoever restores it in two years knows what they are holding.
cat > "${TARGET}/MANIFEST.txt" <<EOF
CGZSA backup
Taken:      ${STAMP}
Host:       $(hostname)
Database:   $(echo "$DATABASE_URL" | sed -E 's#://[^:]+:[^@]+@#://***:***@#')
Storage:    ${STORAGE_PATH}
pg_dump:    $(pg_dump --version)

Restore with scripts/restore.sh, or see the Backups section of README.md.
EOF

# Checksums, so a silently corrupted transfer is detectable before you need it.
( cd "$TARGET" && sha256sum ./* > SHA256SUMS 2>/dev/null || true )

echo "  $(du -sh "$TARGET" | cut -f1) written"

# ── off-site ────────────────────────────────────────────────────────────────
if [ -n "${BACKUP_REMOTE:-}" ]; then
  echo "→ copying off-site to ${BACKUP_REMOTE}"
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "$TARGET" "${BACKUP_REMOTE}/${STAMP}"
  else
    rsync -a "$TARGET/" "${BACKUP_REMOTE}/${STAMP}/"
  fi
  echo "  done"
else
  echo "! BACKUP_REMOTE is not set, so this backup is only on this machine." >&2
  echo "! A backup that lives beside the thing it protects is not a backup." >&2
fi

# ── local retention ─────────────────────────────────────────────────────────
# Off-site retention is set at the destination and is not managed here.
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d | sort | head -n "-${BACKUP_KEEP}" | while read -r old; do
  echo "→ removing local backup $(basename "$old")"
  rm -rf "$old"
done

echo "✓ backup complete: ${TARGET}"
