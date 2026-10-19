# JSO Backend

ASP.NET Core .NET 10 backend foundation.

Projects: JSO.Api, JSO.Application, JSO.Domain, JSO.Infrastructure.

Run locally from repository root:

    docker compose up --build

API: http://localhost:8080
Health: http://localhost:8080/health
Swagger: http://localhost:8080/swagger

The SQL Server password is supplied through MSSQL_SA_PASSWORD. Production credentials must never be committed.

## Database providers

Development defaults to SQL Server. Oracle Ampere A1 production uses PostgreSQL because the SQL Server Linux container is not a supported ARM64 production target.

The provider is selected with `Database:Provider`:

    sqlserver
    postgres

### Local development with PostgreSQL

You can develop locally against PostgreSQL (the production provider) instead of
SQL Server. Start a local PostgreSQL 17 with the provided compose file:

    docker compose -f docker-compose.postgres.yml up -d

Then run the API pointing at it. From the repository root (PowerShell):

    $env:ASPNETCORE_ENVIRONMENT="Development"
    $env:ASPNETCORE_URLS="http://localhost:8080"
    $env:Jwt__Key="local-dev-jwt-secret-at-least-32-characters-long"
    $env:ADMIN_BOOTSTRAP_EMAIL="admin@jso.tn"
    $env:ADMIN_BOOTSTRAP_PASSWORD="LocalAdminPass123"
    $env:Database__Provider="postgres"
    $env:ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=JSO;Username=jso;Password=jso_local_password"
    dotnet run --project src/JSO.Api --no-launch-profile

In Development the app uses `EnsureCreatedAsync` and seeds demo data, so the
schema is created directly from the model (no migration step needed). The
credentials above match the defaults in `docker-compose.postgres.yml`; override
them with a `.env` file or environment variables if you change them.

## Database migrations

Development bootstrap currently uses `EnsureCreatedAsync` so a fresh local database can start with demo data. Production defaults to a manual migration mode so each migration is run once before an API rollout.

Use provider-specific migrations. The initial PostgreSQL migration was generated with the .NET 10 runtime and applied to PostgreSQL 17 in CI; verification on the target Oracle environment is still pending.

PostgreSQL example for a future schema change:

    dotnet ef migrations add NextPostgresChange --project src/JSO.Infrastructure --startup-project src/JSO.Infrastructure --output-dir Migrations/Postgres

The PostgreSQL snapshot is in the Infrastructure assembly. If SQL Server needs migrations in the future, configure a separate migrations assembly and snapshot for that provider; do not generate SQL Server migrations against the PostgreSQL snapshot.

The PostgreSQL migration set is checked in under `src/JSO.Infrastructure/Migrations/Postgres`. CI applies it to PostgreSQL 17 through the same one-off command used for releases, then smoke-tests the API with `Database__MigrationMode=manual`.

### One-off production release initialization

Run the API image built from the release commit once, against the production database, before deploying that image to API replicas:

    dotnet JSO.Api.dll --release-init

The command requires `Database__Provider`, `ConnectionStrings__DefaultConnection` and, when needed, `Database__Host`. It applies pending migrations, ensures production seed/bootstrap data exists, and exits without starting the web server or requiring JWT/CORS settings. Re-running it is safe. On the first production initialization, it also requires `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (at least 12 characters). The regular API fails fast if it detects pending migrations in manual mode and does not write seed data on replica startup.

For a schema-only operation, `dotnet JSO.Api.dll --migrate-only` applies pending migrations and exits without running production seed/bootstrap data.

For a controlled transition from an older deployment, do not roll out an image with pending schema changes until the one-off command can run against the production database. The legacy mode remains temporarily available via `Database__MigrationMode=startup`, but it applies migrations and seed writes in each API instance and is unsuitable for multi-replica rollout. If using it during transition, keep the API at one replica and schedule a switch to manual mode. Schema changes for zero-downtime rollout must remain backward-compatible with both old and new app versions (expand/contract); the migration command does not make incompatible DDL safe by itself.

## Production

Production credentials must be supplied through environment variables or a secret manager. The first production start requires `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (at least 12 characters) to create the initial administrator; later starts do not reset an existing user. Remove the bootstrap password from the environment and recreate the API container after confirming the first login. Do not expose the database port publicly. Configure CORS with the real frontend origin and terminate HTTPS at the reverse proxy.
