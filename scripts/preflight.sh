#!/usr/bin/env bash
#
# Pre-launch check. Run this on the server, from the project directory, before
# pointing real visitors at the site — and again after any change to .env.
#
#   ./scripts/preflight.sh                      # checks config and the local app
#   ./scripts/preflight.sh https://cgzsa.org    # also checks the public address
#
# It reads .env and probes a running instance. Every FAIL is something that will
# bite you in production; every WARN is something you should have a reason for.
#
# Exit code is 0 only when there are no failures, so this can gate a deploy.
#
set -uo pipefail

BASE="${1:-http://127.0.0.1:3000}"
pass=0; warn=0; fail=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; pass=$((pass+1)); }
bad()  { printf "  \033[31m✗\033[0m %s\n     → %s\n" "$1" "$2"; fail=$((fail+1)); }
soft() { printf "  \033[33m!\033[0m %s\n     → %s\n" "$1" "$2"; warn=$((warn+1)); }
head_() { printf "\n\033[1m%s\033[0m\n" "$1"; }

if [ -f .env ]; then set -a; . ./.env; set +a; else
  echo "No .env in $(pwd). Run this from the project directory."; exit 1
fi

echo "CGZSA pre-flight — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Target: $BASE"

# ── secrets ─────────────────────────────────────────────────────────────────
head_ "Secrets and configuration"

weak_or_unset() {   # name value  → 0 if unset/weak
  local v="${2:-}"
  [ -z "$v" ] && return 0
  case "$v" in change-me|changeme|password|secret|test|ChangeThisPassword*) return 0 ;; esac
  [ "${#v}" -lt 16 ] && return 0
  return 1
}

for var in POSTGRES_PASSWORD CRON_SECRET; do
  if weak_or_unset "$var" "${!var:-}"; then
    bad "$var is unset, short or a default" "Generate one: openssl rand -hex 32"
  else
    ok "$var is set and long enough"
  fi
done

if [ -z "${SMTP_URL:-}" ]; then
  bad "SMTP_URL is not set" "Contact notifications, password resets and user invitations are logged instead of sent. An invited user cannot receive their link."
else
  ok "SMTP_URL is set"
fi

if [ -z "${BACKUP_REMOTE:-}" ]; then
  bad "BACKUP_REMOTE is not set" "Backups stay on this machine, so they die with it. This is the single largest risk of going live."
else
  ok "BACKUP_REMOTE is set ($BACKUP_REMOTE)"
  if command -v rclone >/dev/null 2>&1; then
    if rclone lsd "${BACKUP_REMOTE%%:*}:" >/dev/null 2>&1; then
      ok "rclone can reach the backup destination"
    else
      bad "rclone cannot reach ${BACKUP_REMOTE%%:*}:" "Run: rclone config — and check the credentials"
    fi
  else
    soft "rclone is not installed on this host" "The compose backup service installs it in its own container, so this only matters if you run the script directly."
  fi
fi

case "${APP_URL:-}" in
  https://*) ok "APP_URL is https ($APP_URL)" ;;
  "")        bad "APP_URL is not set" "Canonical URLs and share links will be wrong." ;;
  *)         bad "APP_URL is not https ($APP_URL)" "Canonical tags, Open Graph URLs and reset links will all point at the wrong scheme." ;;
esac

TPC="${TRUSTED_PROXY_COUNT:-unset}"
if [ "$TPC" = "unset" ]; then
  soft "TRUSTED_PROXY_COUNT is not set (defaults to 1)" "Set it explicitly to the number of proxies in front of this app."
elif [ "$TPC" = "0" ] && [ "${BASE#https://}" != "$BASE" ]; then
  bad "TRUSTED_PROXY_COUNT=0 but you are testing an https address" "Behind a reverse proxy this should be 1 (or 2 with a CDN). At 0 every visitor shares one rate-limit bucket."
else
  ok "TRUSTED_PROXY_COUNT=$TPC (confirm it matches your proxy layout)"
fi

if [ -n "${SESSION_SECRET:-}" ]; then
  soft "SESSION_SECRET is set but nothing reads it" "Harmless. It was removed from .env.example; you can delete the line."
fi

# ── the running application ────────────────────────────────────────────────
head_ "Running application"

code() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$@"; }

H="$(curl -s --max-time 15 "$BASE/api/health" 2>/dev/null)"
if echo "$H" | grep -q '"ok":true'; then ok "health endpoint reports the database is up"
else bad "health endpoint is not healthy" "Got: ${H:-<no response>}"; fi

for probe in "/:200" "/api/cron:401" "/sitemap.xml:200"; do
  path="${probe%:*}"; want="${probe##*:}"
  got="$(code "$BASE$path")"
  [ "$got" = "$want" ] && ok "$path returns $want" || bad "$path returned $got, expected $want" "Check the route and the reverse proxy."
done

# Upload only accepts POST, so a GET would return 405 rather than the 403 that
# proves the permission check is doing its job.
got="$(code -X POST "$BASE/api/upload")"
[ "$got" = "403" ] && ok "/api/upload refuses an unauthenticated POST" \
  || bad "/api/upload returned $got to an anonymous POST, expected 403" "Uploads must require a signed-in user with media.upload."

got="$(code "$BASE/admin/users")"
if [ "$got" = "307" ] || [ "$got" = "302" ]; then ok "/admin/users redirects an anonymous visitor to sign-in"
else bad "/admin/users returned $got" "Anonymous users must not reach admin screens."; fi

# ── headers ─────────────────────────────────────────────────────────────────
head_ "Security headers"
HDRS="$(curl -sI --max-time 15 "$BASE/" 2>/dev/null)"
for h in content-security-policy x-frame-options x-content-type-options referrer-policy permissions-policy; do
  echo "$HDRS" | grep -qi "^$h:" && ok "$h present" || bad "$h missing" "Check cgzsa-frontend/next.config.ts and the proxy configuration."
done

if [ "${BASE#https://}" != "$BASE" ]; then
  echo "$HDRS" | grep -qi "^strict-transport-security:" \
    && ok "strict-transport-security present" \
    || bad "strict-transport-security missing over https" "Set it at the proxy, or confirm NODE_ENV=production."
fi

# ── canonical and share assets ──────────────────────────────────────────────
head_ "Public metadata"
HOME_HTML="$(curl -s --max-time 15 "$BASE/about" 2>/dev/null)"
if echo "$HOME_HTML" | grep -q 'rel="canonical"'; then
  CANON="$(echo "$HOME_HTML" | grep -o 'rel="canonical" href="[^"]*"' | head -1)"
  case "$CANON" in
    *"/about"*) ok "canonical on /about points at itself" ;;
    *)          bad "canonical on /about is wrong: $CANON" "Every page canonical to '/' tells search engines every page is the home page." ;;
  esac
else
  bad "no canonical tag on /about" "Check APP_URL and the metadata helpers."
fi

[ "$(code "$BASE/og-default.png")" = "200" ] \
  && ok "share image is served" \
  || soft "share image missing" "Links shared on WhatsApp and Facebook will render as a grey box."

# ── exposure ────────────────────────────────────────────────────────────────
head_ "Exposure"
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -qE '0\.0\.0\.0:(5432|3000)|\[::\]:(5432|3000)'; then
    bad "PostgreSQL or the app is listening on all interfaces" "$(ss -ltn | grep -E ':(5432|3000)' | tr -s ' ' | cut -d' ' -f4 | tr '\n' ' ')— bind these to 127.0.0.1 so only the reverse proxy can reach them."
  else
    ok "neither PostgreSQL nor the app is bound to a public interface"
  fi
else
  soft "ss not available, cannot check listening sockets" "Check manually: ss -ltn"
fi

if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -qi "Status: active"; then ok "ufw firewall is active"
  else bad "ufw firewall is inactive" "sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable"; fi
fi

# ── backups ─────────────────────────────────────────────────────────────────
head_ "Backups"
BDIR="${BACKUP_DIR:-./backups}"
if [ -d "$BDIR" ] && [ -n "$(ls -A "$BDIR" 2>/dev/null)" ]; then
  NEWEST="$(ls -1 "$BDIR" | sort | tail -1)"
  ok "most recent local backup: $NEWEST"
  AGE_DAYS=$(( ( $(date -u +%s) - $(date -u -d "$(echo "$NEWEST" | sed 's/T/ /; s/-\([0-9][0-9]\)-\([0-9][0-9]\)Z/:\1:\2/')" +%s 2>/dev/null || echo 0) ) / 86400 ))
  if [ "$AGE_DAYS" -gt 2 ] 2>/dev/null; then
    soft "newest backup is about $AGE_DAYS days old" "Check the backup service: docker compose logs backup"
  fi
else
  bad "no backups found in $BDIR" "Run ./scripts/backup.sh and confirm the nightly service is running."
fi

# ── result ──────────────────────────────────────────────────────────────────
printf "\n\033[1m%s\033[0m\n" "Result"
echo "  $pass passed, $warn warnings, $fail failures"
if [ "$fail" -gt 0 ]; then
  printf "\n  \033[31mNot ready.\033[0m Fix the failures above and run this again.\n\n"
  exit 1
fi
if [ "$warn" -gt 0 ]; then
  printf "\n  \033[33mReady, with warnings.\033[0m Make sure each one is a decision, not an oversight.\n\n"
  exit 0
fi
printf "\n  \033[32mReady.\033[0m\n\n"
