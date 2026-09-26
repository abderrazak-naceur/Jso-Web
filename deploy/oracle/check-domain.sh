#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || "$1" != https://* ]]; then
  echo "Usage: $0 https://your-real-domain.example" >&2
  echo "This check targets a public domain and requires HTTPS." >&2
  exit 2
fi
BASE_URL="${1%/}"
command -v curl >/dev/null 2>&1 || { echo "FAIL: curl is required." >&2; exit 1; }

check() {
  local path="$1" expected="$2" code
  code="$(curl --silent --show-error --location --proto '=https' --proto-redir '=https' --max-redirs 3 --max-time 20 -o /dev/null -w '%{http_code}' "$BASE_URL$path")" || {
    echo "FAIL: HTTPS request failed: $BASE_URL$path" >&2; return 1;
  }
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL: $path returned HTTP $code (expected $expected)." >&2; return 1
  fi
  echo "PASS: $path returned HTTP $code over verified HTTPS"
}
check / 200
check /health 200
check /api/matches 200
check /api/news 200
echo "PASS: public HTTPS, health routing, and public API routes responded. Admin login, uploads, and full browser/CORS behavior need separate checks."
