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

Generate provider-specific migrations only after the target .NET 10 SDK is available and the provider can be executed locally or in CI.

SQL Server example:

    dotnet ef migrations add InitialSqlServer --project src/JSO.Infrastructure --startup-project src/JSO.Api --output-dir Migrations/SqlServer

PostgreSQL example:

    dotnet ef migrations add InitialPostgres --project src/JSO.Infrastructure --startup-project src/JSO.Api --output-dir Migrations/Postgres

SQL Server and PostgreSQL migrations must not be assumed interchangeable.

The repository currently has no generated EF migration checked in; this is intentional until the migration can be generated and verified with the target .NET 10 SDK.

## Production

Production credentials must be supplied through environment variables or a secret manager. Do not expose the database port publicly. Configure CORS with the real frontend origin and terminate HTTPS at the reverse proxy.
