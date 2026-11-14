#!/usr/bin/env bash
# CMS news CRUD + publishing gate against local API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=csrf.sh
source "$ROOT/scripts/csrf.sh"
BASE="${1:-http://127.0.0.1:8080}"
ADMIN_COOKIE="$(mktemp)"
EDITOR_COOKIE="$(mktemp)"
trap 'rm -f "$ADMIN_COOKIE" "$EDITOR_COOKIE"' EXIT

login() {
  local cookie="$1" email="$2"
  curl -fsS -c "$cookie" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"Admin123!\"}" \
    "$BASE/api/auth/login" >/dev/null
}

echo "Login admin + editor…"
login "$ADMIN_COOKIE" 'admin@example.gov.et'
login "$EDITOR_COOKIE" 'editor@example.gov.et'

echo "Unauthenticated CMS → 401"
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/cms/news")"
[[ "$code" == "401" ]] || { echo "expected 401 got $code"; exit 1; }

echo "Admin list…"
curl -fsS -b "$ADMIN_COOKIE" "$BASE/api/cms/news" | grep -q '"items":'

SLUG="smoke-news-$(date +%s)"
echo "Admin create published…"
CREATED="$(api_curl "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Smoke News\",\"slug\":\"$SLUG\",\"summary\":\"s\",\"category\":\"Update\",\"content\":\"Body text\",\"status\":\"published\"}" \
  "$BASE/api/cms/news")"
echo "$CREATED" | grep -q '"status":"published"'
ID="$(echo "$CREATED" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
[[ -n "$ID" ]] || { echo "no id"; exit 1; }

echo "Public can see it…"
curl -fsS "$BASE/api/news/$SLUG" | grep -q '"title":"Smoke News"'

EDITOR_SLUG="editor-smoke-$(date +%s)"
echo "Editor create with status=published → forced draft…"
EDITOR_CREATE="$(api_curl "$EDITOR_COOKIE" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Editor Draft\",\"slug\":\"$EDITOR_SLUG\",\"summary\":\"s\",\"category\":\"Update\",\"content\":\"Editor body\",\"status\":\"published\"}" \
  "$BASE/api/cms/news")"
echo "$EDITOR_CREATE" | grep -q '"status":"draft"'
EDITOR_ID="$(echo "$EDITOR_CREATE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"

echo "Editor cannot keep admin item published on update…"
UPDATED="$(api_curl "$EDITOR_COOKIE" -H 'Content-Type: application/json' -X PUT \
  -d "{\"title\":\"Smoke News\",\"slug\":\"$SLUG\",\"summary\":\"s\",\"category\":\"Update\",\"content\":\"Body text edited\",\"status\":\"published\"}" \
  "$BASE/api/cms/news/$ID")"
echo "$UPDATED" | grep -q '"status":"draft"'

echo "Archive…"
api_curl "$ADMIN_COOKIE" -X DELETE "$BASE/api/cms/news/$ID" | grep -q '"status":"archived"'
api_curl "$ADMIN_COOKIE" -X DELETE "$BASE/api/cms/news/$EDITOR_ID" | grep -q '"status":"archived"'

echo "Public 404 after archive…"
code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/news/$SLUG")"
[[ "$code" == "404" ]] || { echo "expected 404 got $code"; exit 1; }

echo "CSRF rejection without token…"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$ADMIN_COOKIE" -H 'Content-Type: application/json' \
  -d '{"title":"x","slug":"no-csrf","content":"c","status":"draft","summary":"","category":""}' \
  "$BASE/api/cms/news")"
[[ "$code" == "403" ]] || { echo "expected CSRF 403 got $code"; exit 1; }

echo "All CMS news smoke checks passed."
