#!/usr/bin/env bash
# Phase 2.1 — institution profile API smoke (local docker API, default :8081).
set -euo pipefail
BASE="${1:-http://127.0.0.1:8081}"
COOKIE="$(mktemp)"
ORIG_JSON="$(mktemp)"
trap 'rm -f "$COOKIE" "$ORIG_JSON"' EXIT

fail() { echo "FAIL $*" >&2; exit 1; }
ok() { echo "OK   $*"; }

curl -fsS "$BASE/api/institution" >"$ORIG_JSON"
python3 -c 'import json; json.load(open("'"$ORIG_JSON"'")); print("parsed ok")' >/dev/null
grep -q '"mission"' "$ORIG_JSON" || fail "public missing mission"
grep -q '"vision"' "$ORIG_JSON" || fail "public missing vision"
grep -q '"history"' "$ORIG_JSON" || fail "public missing history"
grep -q '"values"' "$ORIG_JSON" || fail "public missing values"
grep -q '"objectives"' "$ORIG_JSON" || fail "public missing objectives"
grep -q '"profileTranslations"' "$ORIG_JSON" || fail "public missing profileTranslations"
grep -q '"shortName"' "$ORIG_JSON" || fail "public missing shortName"
ok "public institution shape"

CODE="$(curl -sS -o /tmp/inst_unauth.json -w '%{http_code}' -X PUT \
  -H 'Content-Type: application/json' \
  -d '{"name":"X","shortName":"X"}' \
  "$BASE/api/cms/institution")"
[[ "$CODE" == "401" || "$CODE" == "403" ]] || fail "unauth PUT expected 401/403 got $CODE"
ok "cms update requires auth ($CODE)"

LOGIN="$(curl -fsS -c "$COOKIE" -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login")"
echo "$LOGIN" | grep -q '"role":"admin"' || fail "admin login"
CSRF="$(awk '$6=="egwp_csrf"{print $7}' "$COOKIE")"
[[ -n "$CSRF" ]] || fail "csrf cookie missing"
ok "admin login + csrf"

NAME="$(python3 -c 'import json; print(json.load(open("'"$ORIG_JSON"'"))["name"])')"
SHORT="$(python3 -c 'import json; print(json.load(open("'"$ORIG_JSON"'"))["shortName"])')"

put_with_overrides() {
  local overrides_path="$1"
  local out_path="$2"
  python3 -c "
import json, urllib.request
src = json.load(open('$ORIG_JSON'))
overrides = json.load(open('$overrides_path'))
out = {
  'name': src.get('name') or '',
  'shortName': src.get('shortName') or '',
  'tagline': src.get('tagline') or '',
  'description': src.get('description') or '',
  'eyebrow': src.get('eyebrow') or '',
  'address': src.get('address') or '',
  'phone': src.get('phone') or '',
  'email': src.get('email') or '',
  'hours': src.get('hours') or '',
  'mission': src.get('mission') or '',
  'vision': src.get('vision') or '',
  'history': src.get('history') or '',
  'values': src.get('values') or [],
  'objectives': src.get('objectives') or [],
  'profileTranslations': src.get('profileTranslations') or {},
}
out.update(overrides)
open('$out_path','w').write(json.dumps(out, ensure_ascii=False))
"
}

# Invalid translation lang
printf '%s' '{"profileTranslations":{"fr":{"mission":"x"}}}' >/tmp/inst_ovr.json
put_with_overrides /tmp/inst_ovr.json /tmp/inst_payload.json
CODE="$(curl -sS -o /tmp/inst_bad_lang.json -w '%{http_code}' -X PUT \
  -b "$COOKIE" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  --data-binary @/tmp/inst_payload.json \
  "$BASE/api/cms/institution")"
[[ "$CODE" == "400" ]] || fail "bad lang expected 400 got $CODE body=$(cat /tmp/inst_bad_lang.json)"
grep -qi 'profileTranslations' /tmp/inst_bad_lang.json || fail "bad lang message missing"
ok "rejects invalid translation lang"

# Invalid values shape
printf '%s' '{"values":{"a":1}}' >/tmp/inst_ovr.json
put_with_overrides /tmp/inst_ovr.json /tmp/inst_payload.json
CODE="$(curl -sS -o /tmp/inst_bad_vals.json -w '%{http_code}' -X PUT \
  -b "$COOKIE" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  --data-binary @/tmp/inst_payload.json \
  "$BASE/api/cms/institution")"
[[ "$CODE" == "400" ]] || fail "bad values expected 400 got $CODE body=$(cat /tmp/inst_bad_vals.json)"
ok "rejects malformed values"

# HTML stripped + persistence
printf '%s' '{"mission":"<b>Smoke mission</b>","vision":"Smoke vision","history":"","values":["Integrity"],"objectives":["Serve the public"],"profileTranslations":{"am":{"mission":"Amharic smoke mission"}}}' >/tmp/inst_ovr.json
put_with_overrides /tmp/inst_ovr.json /tmp/inst_payload.json
CODE="$(curl -sS -o /tmp/inst_save.json -w '%{http_code}' -X PUT \
  -b "$COOKIE" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  --data-binary @/tmp/inst_payload.json \
  "$BASE/api/cms/institution")"
[[ "$CODE" == "200" ]] || fail "valid save expected 200 got $CODE body=$(cat /tmp/inst_save.json)"
grep -q '"mission":"Smoke mission"' /tmp/inst_save.json || fail "HTML not stripped from mission"
grep -q 'Integrity' /tmp/inst_save.json || fail "values not persisted"
grep -q 'Amharic smoke mission' /tmp/inst_save.json || fail "am translation not persisted"
python3 -c '
import json
saved=json.load(open("/tmp/inst_save.json"))
assert saved["name"] == """'"$NAME"'""", saved["name"]
assert saved["shortName"] == """'"$SHORT"'""", saved["shortName"]
'
ok "valid profile save + strip_tags + persistence"

# Restore original
python3 -c '
import json
src = json.load(open("'"$ORIG_JSON"'"))
out = {
  "name": src.get("name") or "",
  "shortName": src.get("shortName") or "",
  "tagline": src.get("tagline") or "",
  "description": src.get("description") or "",
  "eyebrow": src.get("eyebrow") or "",
  "address": src.get("address") or "",
  "phone": src.get("phone") or "",
  "email": src.get("email") or "",
  "hours": src.get("hours") or "",
  "mission": src.get("mission") or "",
  "vision": src.get("vision") or "",
  "history": src.get("history") or "",
  "values": src.get("values") or [],
  "objectives": src.get("objectives") or [],
  "profileTranslations": src.get("profileTranslations") or {},
}
open("/tmp/inst_payload.json","w").write(json.dumps(out, ensure_ascii=False))
'
CODE="$(curl -sS -o /tmp/inst_restore.json -w '%{http_code}' -X PUT \
  -b "$COOKIE" -H "X-CSRF-Token: $CSRF" -H 'Content-Type: application/json' \
  --data-binary @/tmp/inst_payload.json \
  "$BASE/api/cms/institution")"
[[ "$CODE" == "200" ]] || fail "restore expected 200 got $CODE"
ok "restored original institution row"

# Viewer role unavailable in seed — editor can update; unauth already checked.
# Confirm editor can update (authz positive path)
EDITOR_COOKIE="$(mktemp)"
curl -fsS -c "$EDITOR_COOKIE" -H 'Content-Type: application/json' \
  -d '{"email":"editor@example.gov.et","password":"Admin123!"}' \
  "$BASE/api/auth/login" >/tmp/editor_login.json
ECSRF="$(awk '$6=="egwp_csrf"{print $7}' "$EDITOR_COOKIE")"
printf '%s' '{}' >/tmp/inst_ovr.json
# Re-fetch current as base for editor noop-ish update of mission only then restore again
curl -fsS "$BASE/api/institution" >"$ORIG_JSON"
put_with_overrides /tmp/inst_ovr.json /tmp/inst_payload.json
CODE="$(curl -sS -o /tmp/inst_editor.json -w '%{http_code}' -X PUT \
  -b "$EDITOR_COOKIE" -H "X-CSRF-Token: $ECSRF" -H 'Content-Type: application/json' \
  --data-binary @/tmp/inst_payload.json \
  "$BASE/api/cms/institution")"
rm -f "$EDITOR_COOKIE"
[[ "$CODE" == "200" ]] || fail "editor PUT expected 200 got $CODE body=$(cat /tmp/inst_editor.json)"
ok "editor can update institution"

echo "All institution profile smoke checks passed."
