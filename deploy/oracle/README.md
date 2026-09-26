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

### Backup and restore

Run the backup from the repository root on the Oracle VM, choosing a persistent
directory with enough free space (preferably a mounted backup disk):

```bash
chmod +x deploy/oracle/backup.sh
deploy/oracle/backup.sh /mnt/jso-backups
```

The script creates a new timestamped directory outside the repository containing
a PostgreSQL custom format dump, a gzip tar archive of `/app/uploads`, a metadata
`MANIFEST.txt`, and `SHA256SUMS` integrity checks. It streams the dump from the
running `database` container and media from the running `api` container. It does
not stop services or overwrite existing backup files. A directory containing
`INCOMPLETE` is not a usable backup. Keep backup storage access restricted because
it contains database records and uploaded files. Copy backups off the VM.

#### Schedule and verify

Install a daily backup and weekly verification in the VM's crontab, replacing the
repository and backup paths if needed. The commands assume cron runs as the same
restricted OS account that can access Docker and the backup disk:

```cron
15 2 * * * /path/to/Jso-Web/deploy/oracle/backup.sh /mnt/jso-backups >> /mnt/jso-backups/backup.log 2>&1
30 3 * * 0 /path/to/Jso-Web/deploy/oracle/verify-backups.sh /mnt/jso-backups >> /mnt/jso-backups/verify.log 2>&1
```

Make both scripts executable, and create the private backup directory and log
files as that same account before enabling cron:

```bash
install -d -m 700 /mnt/jso-backups
touch /mnt/jso-backups/backup.log /mnt/jso-backups/verify.log
chmod 600 /mnt/jso-backups/backup.log /mnt/jso-backups/verify.log
chmod +x /path/to/Jso-Web/deploy/oracle/{backup,verify-backups,prune-backups}.sh
```

The verifier needs `sha256sum`, `tar`, and
the PostgreSQL client command `pg_restore` installed on the VM; Docker and Compose
alone do not provide the host command used by this check. The retention script
uses GNU `date` and `find` (standard on supported Oracle Linux deployments).

Verification checks checksums, PostgreSQL dump readability (`pg_restore --list`),
and the media tar archive. It creates a `VERIFIED` marker, which means integrity
and readability checks passed; it does **not** prove a restore works. Run the
recovery procedure below on a separate recovery stack. Only after checking health,
representative database records, and uploaded files, record that human-confirmed
result in the backup directory:

```bash
date -u +%Y-%m-%dT%H:%M:%SZ > /mnt/jso-backups/jso-YYYYMMDDTHHMMSSZ/RESTORE_TESTED
```

The `prune-backups.sh` retention tool defaults to a dry run. It considers only
complete backups with both `VERIFIED` and `RESTORE_TESTED`, rechecks checksums, keeps
the newest seven eligible copies, and requires a backup to be at least 30 days old
before considering deletion. Review its output first; apply only when the list is
expected:

```bash
deploy/oracle/prune-backups.sh /mnt/jso-backups --keep 7 --min-age-days 30
deploy/oracle/prune-backups.sh /mnt/jso-backups --keep 7 --min-age-days 30 --apply
```

Schedule the dry run monthly if useful; do not put `--apply` in cron until restore
tests are being recorded and the dry-run list has been reviewed. Unverified or
unproven backups are never eligible for deletion. Keep at least one off-VM copy.

To manually verify all backups at any time:

```bash
deploy/oracle/verify-backups.sh /mnt/jso-backups
```

Restore into a **separate, empty recovery stack with its own database and uploads
volumes** first. Never use the production Compose project name for the recovery
commands. Copy `.env.prod.example` to `.env.recovery`, then set unique recovery
database credentials, a valid JWT secret and a recovery-only public origin. Never
copy production secrets into this file. Keep the recovery stack separate from the
public port 80 web service. These commands start only `database` and `api`.
Create the file before running Compose,
then work from the repository root. Set `BACKUP_DIR` to the backup you want to
test, verify checksums, and restore the database; start the recovery API only
after the database restore:

```bash
BACKUP_DIR=/mnt/jso-backups/jso-YYYYMMDDTHHMMSSZ
(cd "$BACKUP_DIR" && sha256sum --check SHA256SUMS)
docker compose --project-name jso-recovery --env-file .env.recovery -f docker-compose.prod.yml up -d database
docker compose --project-name jso-recovery --env-file .env.recovery -f docker-compose.prod.yml exec -T database \
  sh -ec 'pg_restore --exit-on-error --clean --if-exists --no-owner --no-acl \
    --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' < "$BACKUP_DIR/database.dump"
docker compose --project-name jso-recovery --env-file .env.recovery -f docker-compose.prod.yml up -d api
docker compose --project-name jso-recovery --env-file .env.recovery -f docker-compose.prod.yml exec -T api \
  tar -C /app -xzf - < "$BACKUP_DIR/media.tar.gz"
```

`--clean` drops objects in the selected target database, so inspect the project
name and target before `pg_restore`. The media archive contains `uploads/`;
extraction overlays matching paths. Check application health and representative
records/files in recovery before considering a production restore. This
procedure has **not** been tested against a real production backup; successful
creation and checksum validation do not prove that restore works. Test recovery
before go-live and repeat it periodically.
