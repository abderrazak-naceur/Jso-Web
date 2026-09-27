# Database Schema Validation (PostgreSQL)

This document records a live validation of the checked-in Entity Framework Core
PostgreSQL migration set. Until now the migrations had only been verified at the
snapshot level; this exercise applies every migration against a **real PostgreSQL
17 server** and inspects the resulting schema.

## Summary

| Item | Result |
| --- | --- |
| PostgreSQL server version | 17.11 |
| Migration set | `backend/src/JSO.Infrastructure/Migrations/Postgres` |
| Migrations applied | 16 / 16 |
| `__EFMigrationsHistory` rows | 16 |
| Tables created (`public` schema) | 35 (34 domain tables + `__EFMigrationsHistory`) |
| Outcome | PASS — all migrations applied cleanly, all key tables present |

No application code, entities, migrations, or controllers were changed. The only
repository changes are this report and a minimal schema-assertion step added to the
existing `postgres-ef` CI job.

## Environment

- Backend: .NET 10 SDK (`dotnet` 10.0.401), `dotnet-ef` 10.0.x
- Provider selection (from `JsoDbContextFactory`, `DependencyInjection`, `Program.cs`):
  - `Database__Provider=postgres`
  - `ConnectionStrings__DefaultConnection=Host=<host>;Port=5432;Database=JSO;Username=jso;Password=***`
- PostgreSQL image/credentials aligned with `docker-compose.postgres.yml`
  (`postgres:17`, DB `JSO`, user `jso`).

> The password is a dev-only local value and is intentionally omitted from this
> report and from CI logs.

## How PostgreSQL was started

A PostgreSQL 17 server was started via the container runtime, matching the
database, user, and credentials used in `docker-compose.postgres.yml`:

```bash
docker run -d --name jso-db-validate \
  -e POSTGRES_DB=JSO \
  -e POSTGRES_USER=jso \
  -e POSTGRES_PASSWORD=*** \
  -p 5432:5432 \
  postgres:17-alpine
# wait for readiness
pg_isready -U jso -d JSO
```

## Applying the migrations

With the provider and connection string pointed at the server, the full
PostgreSQL migration set was applied with `dotnet-ef`:

```bash
export Database__Provider=postgres
export ConnectionStrings__DefaultConnection="Host=<host>;Port=5432;Database=JSO;Username=jso;Password=***"

dotnet ef database update \
  --project backend/src/JSO.Infrastructure \
  --startup-project backend/src/JSO.Infrastructure
```

All 16 migrations applied in order, finishing with `Done.`:

```
Applying migration '20260926105726_InitialPostgres'.
Applying migration '20260926144855_AddSponsor'.
Applying migration '20260926150000_ExtendMatchEvent'.
Applying migration '20260926153642_AddFanUser'.
Applying migration '20260926190330_AddProduct'.
Applying migration '20260926204424_AddLiveBlogEntry'.
Applying migration '20260926214642_AddVolunteerAndMatchAssignment'.
Applying migration '20260926223917_AddArchiveItem'.
Applying migration '20260926223949_AddNewsletterSubscription'.
Applying migration '20260926223953_AddPlayerInjury'.
Applying migration '20260926235709_AddArticleEditorialCalendar'.
Applying migration '20260926235813_AddSupporterBrick'.
Applying migration '20260926235821_AddMatchdayChecklist'.
Applying migration '20260927055200_AddScoutingNote'.
Applying migration '20260927055244_AddFacility'.
Applying migration '20260927055319_AddClassifiedAd'.
Done.
```

## Schema inspection

`\dt` reported **35 tables** in the `public` schema:

```
AdminUsers                     ArchiveItems                   ArticleMetadata
Articles                       AuditLogs                      ClassifiedAds
Clubs                          Competitions                   Facilities
FacilityBookings               FanUsers                       LiveBlogEntries
MaintenanceLogs                MatchAssignments               MatchEvents
MatchLineups                   MatchOfficials                 MatchStats
MatchdayChecklistItems         MatchdayChecklistTemplateItems Matches
MediaAssets                    NewsletterSubscriptions        PlayerInjuries
Players                        Products                       ScoutingNotes
Seasons                        SiteContents                   Sponsors
StaffMembers                   SupporterBricks                Teams
Volunteers                     __EFMigrationsHistory
```

### Key tables confirmed present

`FanUsers`, `Products`, `LiveBlogEntries`, `Volunteers`, `MatchAssignments`,
`PlayerInjuries`, `ArchiveItems`, `NewsletterSubscriptions`,
`MatchdayChecklistItems`, `MatchdayChecklistTemplateItems`, `SupporterBricks`,
`ScoutingNotes`, `Facilities`, `FacilityBookings`, `MaintenanceLogs`,
`ClassifiedAds`, plus all base tables (`AdminUsers`, `Clubs`, `Seasons`,
`Competitions`, `Teams`, `Players`, `Matches`, `MatchEvents`, `MatchLineups`,
`Sponsors`, ...).

`FeatureFlags` is **not** present, which is expected — its migration is not yet on
`main`.

### `__EFMigrationsHistory`

```sql
SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";
```

returned all 16 migration ids (`COUNT(*) = 16`), matching the checked-in set
one-for-one.

## Continuous integration

The existing `.github/workflows/ci.yml` already contains a `postgres-ef` job that
spins up a `postgres:17-alpine` service container, applies the migrations with
`dotnet ef database update`, and runs a full API smoke test.

This validation adds one minimal, secret-free step, **"Validate applied schema"**,
immediately after the migration is applied. It uses `psql` against the CI service
container to assert:

1. the number of rows in `__EFMigrationsHistory` equals the number of checked-in
   PostgreSQL migration files;
2. every checked-in migration id is present in the history table;
3. all key tables exist in the `public` schema.

The step fails loudly if a migration ever stops applying or a table goes missing,
turning schema drift into a hard CI failure.

## Reproducing locally

```bash
# 1. Start PostgreSQL 17 (dev credentials from docker-compose.postgres.yml)
docker compose -f docker-compose.postgres.yml up -d

# 2. Point EF at it and apply the migrations
export Database__Provider=postgres
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=JSO;Username=jso;Password=jso_local_password"
dotnet ef database update \
  --project backend/src/JSO.Infrastructure \
  --startup-project backend/src/JSO.Infrastructure

# 3. Inspect the schema
docker compose -f docker-compose.postgres.yml exec postgres \
  psql -U jso -d JSO -c '\dt'
```
