#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="${ENV_FILE:-.env.prod}"

fail() { echo "FAIL: $*" >&2; exit 1; }
[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE (copy .env.prod.example and set real values)."
command -v docker >/dev/null 2>&1 || fail "Docker is required for Compose validation."

value() {
  local key="$1" v
  v="$(sed -n "s/^${key}=//p" "$ENV_FILE" | tail -n 1)"
  v="${v%$'\r'}"                       # strip trailing CR from CRLF-authored files
  if [[ ${#v} -ge 2 && ( ( ${v:0:1} == '"' && ${v: -1} == '"' ) || ( ${v:0:1} == "'" && ${v: -1} == "'" ) ) ]]; then
    v="${v:1:${#v}-2}"                 # strip matching surrounding quotes
  fi
  printf '%s' "$v"
}
for key in JWT_SECRET PUBLIC_ORIGIN POSTGRES_USER POSTGRES_PASSWORD; do
  v="$(value "$key")"
  [[ -n "$v" ]] || fail "$key is empty or missing in $ENV_FILE."
  [[ "$v" != *replace-with-* ]] || fail "$key still has an example placeholder."
done
jwt="$(value JWT_SECRET)"
[[ ${#jwt} -ge 32 ]] || fail "JWT_SECRET must contain at least 32 characters."
origin="$(value PUBLIC_ORIGIN)"
[[ "$origin" == https://* ]] || fail "PUBLIC_ORIGIN must use https:// for production."
[[ "$origin" != */ ]] || fail "PUBLIC_ORIGIN must not end with a slash."

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-jso}"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml config --quiet || fail "Compose configuration is invalid."
echo "PASS: required production settings are present and Compose configuration is valid."
echo "NOTE: this checks local configuration only; it does not verify DNS, TLS, or a running VM."
