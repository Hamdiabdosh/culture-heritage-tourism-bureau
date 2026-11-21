#!/usr/bin/env bash
# Phase 2.2 — validate 008 (and rollback) on a DISPOSABLE database inside the local mysql container.
# Never touches the egwp app database. Usage: bash scripts/test-migration-008.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=egwp_mig_test
sql() { docker compose exec -T mysql mariadb -uroot -pegwp_root "$@"; }
fail() { echo "FAIL $*" >&2; sql -e "DROP DATABASE IF EXISTS $DB;" || true; exit 1; }
ok() { echo "OK   $*"; }
expect_error() {
  local label="$1" stmt="$2"
  if sql "$DB" -e "$stmt" >/dev/null 2>&1; then fail "$label (statement succeeded)"; fi
  ok "$label rejected"
}

A=aaaaaaaa-0000-4000-8000-000000000001
B=bbbbbbbb-0000-4000-8000-000000000002
D=d0000000-0000-4000-8000-00000000000a

sql -e "DROP DATABASE IF EXISTS $DB; CREATE DATABASE $DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sql "$DB" < database/mysql/001_schema.sql
sql "$DB" < database/mysql/007_institution_profile_fields.sql
sql "$DB" < database/mysql/008_org_structure.sql
ok "001 + 007 + 008 applied"
sql "$DB" < database/mysql/008_org_structure.sql
ok "008 re-run is idempotent"

sql "$DB" -e "
INSERT INTO institutions (id,name,short_name) VALUES ('$A','A','A'),('$B','B','B');
INSERT INTO departments (id,institution_id,slug,name,translations) VALUES ('$D','$A','ops','Ops','{}');
INSERT INTO people (id,institution_id,department_id,slug,full_name,title,translations)
  VALUES (UUID(),'$A','$D','x','X','T','{}'), (UUID(),'$A',NULL,'y','Y','T','{}');
INSERT INTO departments (id,institution_id,slug,name,translations) VALUES (UUID(),'$B','ops','Ops B','{}');
" || fail "valid inserts"
ok "valid inserts (dept link, null dept, same slug in other institution)"

expect_error "cross-institution department link" \
  "INSERT INTO people (id,institution_id,department_id,slug,full_name,title,translations) VALUES (UUID(),'$B','$D','z','Z','T','{}');"
expect_error "hard delete of referenced department" "DELETE FROM departments WHERE id='$D';"
expect_error "duplicate slug in same institution" \
  "INSERT INTO departments (id,institution_id,slug,name,translations) VALUES (UUID(),'$A','ops','Dup','{}');"
expect_error "invalid status" \
  "INSERT INTO departments (id,institution_id,slug,name,translations,status) VALUES (UUID(),'$A','s1','S','{}','live');"
expect_error "non-object translations JSON" \
  "INSERT INTO departments (id,institution_id,slug,name,translations) VALUES (UUID(),'$A','s2','S','[1]');"
expect_error "malformed translations JSON" \
  "INSERT INTO people (id,institution_id,slug,full_name,title,translations) VALUES (UUID(),'$A','s3','S','T','{bad');"

sql "$DB" < database/mysql/008_org_structure.rollback.sql
TABLES="$(sql "$DB" -N -e "SHOW TABLES;" | tr '\n' ' ')"
[[ "$TABLES" != *departments* && "$TABLES" != *people* ]] || fail "rollback left tables: $TABLES"
[[ "$TABLES" == *institutions* && "$TABLES" == *pages* ]] || fail "rollback removed unrelated tables: $TABLES"
[[ "$(sql "$DB" -N -e "SELECT COUNT(*) FROM institutions;")" == "2" ]] || fail "institutions rows changed"
sql "$DB" -N -e "SHOW COLUMNS FROM institutions LIKE 'mission';" | grep -q mission || fail "007 columns lost"
ok "rollback drops only departments + people"

sql -e "DROP DATABASE $DB;"
echo "Migration 008 validation passed (disposable DB dropped)."
