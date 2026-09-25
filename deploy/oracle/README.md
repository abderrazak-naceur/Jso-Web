# Oracle Cloud deployment

## Prerequisites

- Oracle Ampere A1 VM running a supported Linux distribution.
- Docker Engine and Docker Compose plugin installed.
- DNS record for the JSO domain pointing to the VM.
- `.env.prod` created from `.env.prod.example`.
- Ports 80 and 443 allowed. Keep PostgreSQL private.

## First deployment

From the repository root:

```bash
cp .env.prod.example .env.prod
nano .env.prod
chmod +x deploy/oracle/deploy.sh
deploy/oracle/deploy.sh
```

The script validates required environment variables, builds the production stack, starts the containers and checks `/health` through Nginx.

## HTTPS

The current Nginx configuration is the HTTP baseline. Put Cloudflare or another TLS reverse proxy in front of it for HTTPS. Do not expose PostgreSQL publicly.

For Cloudflare, use a DNS record for the public JSO domain and configure SSL/TLS according to the chosen certificate strategy.

## Operations

Useful commands:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f database
```

Before production go-live, test backup/restore and confirm the GitHub CI workflows are successful.
