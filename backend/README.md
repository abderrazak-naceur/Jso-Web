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

## Database migrations

Development bootstrap currently uses `EnsureCreatedAsync` so a fresh local database can start with demo data. Production startup now uses `Database.MigrateAsync()`.

Use provider-specific migrations. The initial PostgreSQL migration was generated with the .NET 10 runtime and applied to PostgreSQL 17 in CI; verification on the target Oracle environment is still pending.

PostgreSQL example for a future schema change:

    dotnet ef migrations add NextPostgresChange --project src/JSO.Infrastructure --startup-project src/JSO.Infrastructure --output-dir Migrations/Postgres

The PostgreSQL snapshot is in the Infrastructure assembly. If SQL Server needs migrations in the future, configure a separate migrations assembly and snapshot for that provider; do not generate SQL Server migrations against the PostgreSQL snapshot.

The initial PostgreSQL migration is checked in under `src/JSO.Infrastructure/Migrations/Postgres`. CI applies it to PostgreSQL 17 and smoke-tests the production API bootstrap. For migration commands, use `JSO.Infrastructure` as both project and startup project; it contains the design-time context factory.

## Production

Production credentials must be supplied through environment variables or a secret manager. The first production start requires `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (at least 12 characters) to create the initial administrator; later starts do not reset an existing user. Remove the bootstrap password from the environment and recreate the API container after confirming the first login. Do not expose the database port publicly. Configure CORS with the real frontend origin and terminate HTTPS at the reverse proxy.
