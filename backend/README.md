# JSO Backend

ASP.NET Core .NET 10 backend foundation.

Projects: JSO.Api, JSO.Application, JSO.Domain, JSO.Infrastructure.

Run locally from repository root:

    docker compose up --build

API: http://localhost:8080
Health: http://localhost:8080/health
Swagger: http://localhost:8080/swagger

The SQL Server password is supplied through MSSQL_SA_PASSWORD. Production credentials must never be committed.

## Database migrations

Development bootstrap currently uses `EnsureCreatedAsync` so a fresh local database can start with demo data. Before production deployment, replace that bootstrap path with EF Core migrations.

From the backend directory, once the .NET 10 SDK is available:

    dotnet ef migrations add InitialCreate --project src/JSO.Infrastructure --startup-project src/JSO.Api --output-dir Migrations
    dotnet ef database update --project src/JSO.Infrastructure --startup-project src/JSO.Api

After the initial migration is committed, production startup should use `Database.MigrateAsync()` rather than `EnsureCreatedAsync()`.

The repository currently has no generated EF migration checked in; this is intentional until the migration can be generated and verified with the target .NET 10 SDK.
