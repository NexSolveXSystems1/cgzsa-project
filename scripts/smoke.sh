#!/usr/bin/env bash
# A quick check that a running instance behaves. Usage: scripts/smoke.sh [base-url]
set -euo pipefail
B="${1:-http://localhost:3000}"
pass=0; fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "  ok   $1"; pass=$((pass+1));
  else echo "  FAIL $1 (expected $2, got $3)"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "Smoke test against $B"
check "home"                200 "$(code "$B/")"
check "programme page"      200 "$(code "$B/programs/safe-drinking-water")"
check "about"               200 "$(code "$B/about")"
check "contact"             200 "$(code "$B/contact")"
check "search"              200 "$(code "$B/search?q=water")"
check "sitemap"             200 "$(code "$B/sitemap.xml")"
check "sign-in page"        200 "$(code "$B/admin")"
check "unknown page is 404" 404 "$(code "$B/no-such-page")"
check "contact rejects junk" 400 "$(code -X POST "$B/api/contact" -H 'content-type: application/json' -d '{}')"

reply=$(curl -s -X POST "$B/api/chat/message" -H 'content-type: application/json' \
  -d '{"body":"Where is your office?"}')
echo "$reply" | grep -q "Duport Road" \
  && { echo "  ok   assistant answers from published content"; pass=$((pass+1)); } \
  || { echo "  FAIL assistant answer"; fail=$((fail+1)); }

refuse=$(curl -s -X POST "$B/api/chat/message" -H 'content-type: application/json' \
  -d '{"body":"How much did your biggest donor give?"}')
echo "$refuse" | grep -q "do not want to guess" \
  && { echo "  ok   assistant refuses what is not published"; pass=$((pass+1)); } \
  || { echo "  FAIL assistant should have refused"; fail=$((fail+1)); }

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
