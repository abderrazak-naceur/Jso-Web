#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.prod ]]; then
  echo "Missing .env.prod. Copy .env.prod.example and set production secrets."
  exit 1
fi

required=(JWT_SECRET PUBLIC_ORIGIN POSTGRES_USER POSTGRES_PASSWORD)
for name in "${required[@]}"; do
  if ! grep -Eq "^${name}=.+$" .env.prod; then
    echo "Missing ${name} in .env.prod"
    exit 1
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required."
  exit 1
fi

export COMPOSE_PROJECT_NAME=jso

echo "Building and starting JSO production stack..."
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

echo "Waiting for API health..."
for i in {1..30}; do
  if curl -fsS http://127.0.0.1/health >/dev/null; then
    echo "JSO production stack is healthy."
    exit 0
  fi
  sleep 5
done

echo "Health check failed. Showing service status:"
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
exit 1
