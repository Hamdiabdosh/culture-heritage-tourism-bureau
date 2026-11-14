#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=csrf.sh
source "$ROOT/scripts/csrf.sh"
BASE="${1:-http://127.0.0.1:8080}"
ADMIN="$(mktemp)"
EDITOR="$(mktemp)"
trap 'rm -f "$ADMIN" "$EDITOR"' EXIT

curl -fsS -c "$ADMIN" -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" >/dev/null
curl -fsS -c "$EDITOR" -H 'Content-Type: application/json' \
  -d '{"email":"editor@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" >/dev/null

echo "Editor forbidden…"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$EDITOR" "$BASE/api/cms/users")"
[[ "$code" == "403" ]] || { echo "expected 403 got $code"; exit 1; }

echo "Admin list…"
LIST="$(curl -fsS -b "$ADMIN" "$BASE/api/cms/users")"
echo "$LIST" | grep -q 'admin@example.gov.et'
echo "$LIST" | grep -q 'editor@example.gov.et'

EDITOR_ID="$(echo "$LIST" | sed -n 's/.*"id":"\([^"]*\)","name":"CMS Editor".*/\1/p' | head -1)"
if [[ -z "$EDITOR_ID" ]]; then
  EDITOR_ID="$(echo "$LIST" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(u["id"] for u in d["items"] if u["email"]=="editor@example.gov.et"))')"
fi
ADMIN_ID="$(echo "$LIST" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(u["id"] for u in d["items"] if u["email"]=="admin@example.gov.et"))')"

echo "Cannot demote last admin…"
code="$(curl -s -o /tmp/lastadmin.json -w '%{http_code}' -b "$ADMIN" -c "$ADMIN" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $(csrf_token_from_jar "$ADMIN")" -X PUT \
  -d '{"role":"editor"}' "$BASE/api/cms/users/$ADMIN_ID")"
[[ "$code" == "409" ]] || { echo "expected 409 got $code $(cat /tmp/lastadmin.json)"; exit 1; }

echo "Cannot deactivate last admin…"
code="$(curl -s -o /tmp/lastadmin2.json -w '%{http_code}' -b "$ADMIN" -c "$ADMIN" \
  -H 'Content-Type: application/json' -H "X-CSRF-Token: $(csrf_token_from_jar "$ADMIN")" -X PUT \
  -d '{"active":false}' "$BASE/api/cms/users/$ADMIN_ID")"
[[ "$code" == "409" ]] || { echo "expected 409 got $code $(cat /tmp/lastadmin2.json)"; exit 1; }

echo "Demote editor to viewer then restore…"
api_curl "$ADMIN" -H 'Content-Type: application/json' -X PUT \
  -d '{"role":"viewer"}' "$BASE/api/cms/users/$EDITOR_ID" | grep -q '"role":"viewer"'
api_curl "$ADMIN" -H 'Content-Type: application/json' -X PUT \
  -d '{"role":"editor"}' "$BASE/api/cms/users/$EDITOR_ID" | grep -q '"role":"editor"'

echo "Deactivate editor (drops sessions)…"
api_curl "$ADMIN" -H 'Content-Type: application/json' -X PUT \
  -d '{"active":false}' "$BASE/api/cms/users/$EDITOR_ID" | grep -q '"active":false'
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$EDITOR" "$BASE/api/cms/news")"
[[ "$code" == "401" ]] || { echo "expected editor session dead 401 got $code"; exit 1; }

echo "Reactivate editor…"
api_curl "$ADMIN" -H 'Content-Type: application/json' -X PUT \
  -d '{"active":true}' "$BASE/api/cms/users/$EDITOR_ID" | grep -q '"active":true'

echo "All CMS users smoke checks passed."
