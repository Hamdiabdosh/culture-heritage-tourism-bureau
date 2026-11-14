#!/usr/bin/env bash
# Quick smoke test for local docker PHP API (port 8080).
set -euo pipefail
BASE="${1:-http://127.0.0.1:8080}"
COOKIE="$(mktemp)"
trap 'rm -f "$COOKIE"' EXIT

check() {
  local name="$1" url="$2" expect="$3"
  local body
  body="$(curl -fsS "$url")"
  echo "$body" | grep -q "$expect" || {
    echo "FAIL $name — expected /$expect/ in: $body" >&2
    exit 1
  }
  echo "OK   $name"
}

check institution "$BASE/api/institution" '"shortName":"NPSO"'
check news "$BASE/api/news" '"items":'
check pages "$BASE/api/pages" '"items":'
check events "$BASE/api/events" '"items":'
check services "$BASE/api/services" '"items":'
check documents "$BASE/api/documents" '"items":'

curl -fsS -c "$COOKIE" -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" | grep -q '"role":"admin"'
echo "OK   login"

curl -fsS -b "$COOKIE" "$BASE/api/auth/session" | grep -q '"role":"admin"'
echo "OK   session"

echo "All smoke checks passed."
