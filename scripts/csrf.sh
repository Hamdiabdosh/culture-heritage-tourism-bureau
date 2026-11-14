# shellcheck shell=bash
# Helpers for double-submit CSRF against the PHP API.
# Usage: source scripts/csrf.sh

csrf_token_from_jar() {
  local jar="$1"
  # Netscape cookie jar: domain flag path secure expiry name value
  awk -F'\t' '$6 == "egwp_csrf" { print $7 }' "$jar" | tail -1
}

# curl wrapper: -b/-c jar + X-CSRF-Token for mutating calls.
api_curl() {
  local jar="$1"
  shift
  local tok
  tok="$(csrf_token_from_jar "$jar")"
  if [[ -n "$tok" ]]; then
    curl -fsS -b "$jar" -c "$jar" -H "X-CSRF-Token: $tok" "$@"
  else
    curl -fsS -b "$jar" -c "$jar" "$@"
  fi
}
