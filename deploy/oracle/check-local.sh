#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"
[[ "$BASE_URL" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?/?$ ]] || {
  echo "Usage: $0 [http://127.0.0.1[:port]] (local smoke test only)" >&2; exit 2;
}
command -v curl >/dev/null 2>&1 || { echo "FAIL: curl is required." >&2; exit 1; }

check() {
  local path="$1" expected="$2" code
  code="$(curl --silent --show-error --max-time 10 -o /dev/null -w '%{http_code}' "$BASE_URL$path")" || {
    echo "FAIL: request failed: $BASE_URL$path" >&2; return 1;
  }
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL: $path returned HTTP $code (expected $expected)." >&2; return 1
  fi
  echo "PASS: $path returned HTTP $code"
}
check / 200
check /health 200
check /api/matches 200
check /api/news 200
echo "PASS: local web, health proxy, and public API routes responded. This says nothing about public DNS or HTTPS."
