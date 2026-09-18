# JSO Backend

ASP.NET Core .NET 10 backend foundation.

Projects: JSO.Api, JSO.Application, JSO.Domain, JSO.Infrastructure.

Run locally from repository root:

    docker compose up --build

API: http://localhost:8080
Health: http://localhost:8080/health
Swagger: http://localhost:8080/swagger

The SQL Server password is supplied through MSSQL_SA_PASSWORD. Production credentials must never be committed.
