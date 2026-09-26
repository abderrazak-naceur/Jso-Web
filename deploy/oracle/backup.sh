#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.prod.yml}"

usage() {
  echo "Usage: $0 OUTPUT_DIRECTORY" >&2
  echo "Creates a new timestamped backup directory inside OUTPUT_DIRECTORY." >&2
}

if [[ $# -ne 1 || -z "$1" ]]; then
  usage
  exit 2
fi
if [[ ! -f "$ENV_FILE" || ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing production env or compose file (ENV_FILE / COMPOSE_FILE)." >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required." >&2
  exit 1
fi
if ! command -v sha256sum >/dev/null 2>&1; then
  echo "sha256sum is required to verify the backup." >&2
  exit 1
fi

umask 077
OUTPUT_ROOT="$(mkdir -p -- "$1" && cd -- "$1" && pwd)"
case "$OUTPUT_ROOT/" in
  "$ROOT_DIR/"*)
    echo "Choose a backup directory outside the repository." >&2
    exit 2
    ;;
esac
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$OUTPUT_ROOT/jso-$STAMP"
mkdir -- "$BACKUP_DIR" || { echo "Backup directory already exists: $BACKUP_DIR" >&2; exit 1; }
touch "$BACKUP_DIR/INCOMPLETE"
cleanup() {
  if [[ -n "${STAGING_DIR:-}" && -d "$STAGING_DIR" ]]; then
    rm -rf -- "$STAGING_DIR"
  fi
}
trap cleanup EXIT
STAGING_DIR="$(mktemp -d "$BACKUP_DIR/.staging.XXXXXX")"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-jso}"
compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
if ! "${compose[@]}" ps --status running --services | grep -qx database; then
  echo "The database service must be running before backup." >&2
  exit 1
fi
if ! "${compose[@]}" ps --status running --services | grep -qx api; then
  echo "The API service must be running to archive its uploads volume." >&2
  exit 1
fi

echo "Dumping PostgreSQL database..."
"${compose[@]}" exec -T database sh -ec 'pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' > "$STAGING_DIR/database.dump"
[[ -s "$STAGING_DIR/database.dump" ]] || { echo "Database dump is empty." >&2; exit 1; }

echo "Archiving media from /app/uploads..."
"${compose[@]}" exec -T api sh -ec 'tar -C /app -czf - uploads' > "$STAGING_DIR/media.tar.gz"
[[ -s "$STAGING_DIR/media.tar.gz" ]] || { echo "Media archive is empty." >&2; exit 1; }

{
  echo "format=jso-postgres-media-backup-v1"
  echo "created_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "compose_project=$COMPOSE_PROJECT_NAME"
  echo "database=JSO (PostgreSQL custom format)"
  echo "media_source=api:/app/uploads"
  echo "restore_tested=false"
} > "$STAGING_DIR/MANIFEST.txt"
(cd "$STAGING_DIR" && sha256sum database.dump media.tar.gz MANIFEST.txt) > "$STAGING_DIR/SHA256SUMS"

mv -- "$STAGING_DIR/database.dump" "$BACKUP_DIR/database.dump"
mv -- "$STAGING_DIR/media.tar.gz" "$BACKUP_DIR/media.tar.gz"
mv -- "$STAGING_DIR/MANIFEST.txt" "$BACKUP_DIR/MANIFEST.txt"
mv -- "$STAGING_DIR/SHA256SUMS" "$BACKUP_DIR/SHA256SUMS"
rmdir -- "$STAGING_DIR"
STAGING_DIR=""
rm -- "$BACKUP_DIR/INCOMPLETE"
echo "Backup completed: $BACKUP_DIR"
echo "Verify with: (cd \"$BACKUP_DIR\" && sha256sum --check SHA256SUMS)"
