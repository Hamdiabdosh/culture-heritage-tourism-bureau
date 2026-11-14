#!/usr/bin/env bash
# CMS CRUD smoke for pages, news, events, services, documents.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=csrf.sh
source "$ROOT/scripts/csrf.sh"
BASE="${1:-http://127.0.0.1:8080}"
COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT
TS="$(date +%s)"

curl -fsS -c "$COOKIE" -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" >/dev/null

create() {
  local path="$1" body="$2" expect="$3"
  local res
  res="$(api_curl "$COOKIE" -H 'Content-Type: application/json' -d "$body" "$BASE$path")"
  echo "$res" | grep -q "$expect" || { echo "FAIL create $path: $res"; exit 1; }
  echo "$res" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1
}

archive() {
  local path="$1"
  api_curl "$COOKIE" -X DELETE "$BASE$path" | grep -q '"status":"archived"'
}

echo "pages…"
PAGE_ID="$(create /api/cms/pages \
  "{\"title\":\"Smoke Page\",\"slug\":\"smoke-page-$TS\",\"content\":\"Hello\",\"status\":\"published\",\"translations\":{\"am\":{\"title\":\"ገጽ\",\"content\":\"ሰላም\"}}}" \
  '"status":"published"')"
curl -fsS "$BASE/api/pages/smoke-page-$TS?lang=am" | grep -q 'ገጽ'
archive "/api/cms/pages/$PAGE_ID"

echo "events…"
EVENT_ID="$(create /api/cms/events \
  "{\"title\":\"Smoke Event\",\"slug\":\"smoke-event-$TS\",\"summary\":\"s\",\"content\":\"c\",\"eventDate\":\"2030-06-15T10:30\",\"location\":\"Addis\",\"type\":\"Meeting\",\"status\":\"published\"}" \
  '"status":"published"')"
archive "/api/cms/events/$EVENT_ID"

echo "services…"
SVC_ID="$(create /api/cms/services \
  "{\"title\":\"Smoke Service\",\"slug\":\"smoke-service-$TS\",\"summary\":\"s\",\"description\":\"d\",\"category\":\"Info\",\"responsibleOffice\":\"Desk\",\"eligibility\":\"All\",\"requiredDocuments\":[\"ID\"],\"process\":[\"Apply\"],\"contact\":\"a@b.c\",\"icon\":\"file\",\"status\":\"published\"}" \
  '"status":"published"')"
archive "/api/cms/services/$SVC_ID"

echo "documents…"
DOC_ID="$(create /api/cms/documents \
  "{\"title\":\"Smoke Doc\",\"slug\":\"smoke-doc-$TS\",\"summary\":\"s\",\"category\":\"Report\",\"year\":\"2026\",\"fileUrl\":\"/files/x.pdf\",\"fileType\":\"PDF\",\"fileSize\":\"1 KB\",\"status\":\"published\"}" \
  '"status":"published"')"
archive "/api/cms/documents/$DOC_ID"

echo "editor publish gate on pages…"
EDITOR="$(mktemp)"
curl -fsS -c "$EDITOR" -H 'Content-Type: application/json' \
  -d '{"email":"editor@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" >/dev/null
RES="$(api_curl "$EDITOR" -H 'Content-Type: application/json' \
  -d "{\"title\":\"Editor Page\",\"slug\":\"editor-page-$TS\",\"content\":\"x\",\"status\":\"published\"}" \
  "$BASE/api/cms/pages")"
echo "$RES" | grep -q '"status":"draft"'
EID="$(echo "$RES" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)"
api_curl "$COOKIE" -X DELETE "$BASE/api/cms/pages/$EID" >/dev/null
rm -f "$EDITOR"

"$ROOT/scripts/smoke-cms-news.sh" "$BASE"

echo "All CMS entity smoke checks passed."
