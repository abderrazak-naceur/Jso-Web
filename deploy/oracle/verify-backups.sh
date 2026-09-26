#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "Usage: $0 BACKUP_ROOT [BACKUP_DIRECTORY]" >&2
  echo "Checks completed backup checksums, PostgreSQL dump readability, and media archive readability." >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then usage; exit 2; fi
for tool in sha256sum pg_restore tar; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Required command missing: $tool" >&2; exit 1; }
done

ROOT="$(cd -- "$1" && pwd -P)"
verify_one() {
  local dir="$1"
  [[ -d "$dir" && ! -L "$dir" ]] || { echo "Not a backup directory: $dir" >&2; return 1; }
  [[ "$(dirname -- "$dir")" == "$ROOT" ]] || { echo "Backup must be directly under $ROOT: $dir" >&2; return 1; }
  [[ "$(basename -- "$dir")" == jso-* ]] || { echo "Unexpected backup directory name: $dir" >&2; return 1; }
  [[ ! -e "$dir/INCOMPLETE" ]] || { echo "Incomplete backup: $dir" >&2; return 1; }
  for file in database.dump media.tar.gz MANIFEST.txt SHA256SUMS; do
    [[ -f "$dir/$file" && ! -L "$dir/$file" ]] || { echo "Missing or unsafe file: $dir/$file" >&2; return 1; }
  done
  (cd -- "$dir" && sha256sum --check --status SHA256SUMS) || { echo "Checksum verification failed: $dir" >&2; return 1; }
  pg_restore --list "$dir/database.dump" >/dev/null || { echo "PostgreSQL dump is unreadable: $dir" >&2; return 1; }
  tar -tzf "$dir/media.tar.gz" >/dev/null || { echo "Media archive is unreadable: $dir" >&2; return 1; }
  printf 'verified_utc=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$dir/VERIFIED.tmp"
  mv -- "$dir/VERIFIED.tmp" "$dir/VERIFIED"
  echo "Verified: $dir (integrity/readability only; restore not proven)"
}

if [[ $# -eq 2 ]]; then
  dir="$(cd -- "$(dirname -- "$2")" && pwd -P)/$(basename -- "$2")"
  verify_one "$dir"
else
  status=0
  shopt -s nullglob
  dirs=("$ROOT"/jso-*)
  ((${#dirs[@]})) || { echo "No backup directories found under $ROOT"; exit 0; }
  for dir in "${dirs[@]}"; do
    [[ -d "$dir" && ! -L "$dir" ]] || continue
    verify_one "$dir" || status=1
  done
  exit "$status"
fi
