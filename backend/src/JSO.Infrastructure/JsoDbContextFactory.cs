using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace JSO.Infrastructure;

public sealed class JsoDbContextFactory : IDesignTimeDbContextFactory<JsoDbContext>
{
    public JsoDbContext CreateDbContext(string[] args)
    {
        var provider = (Environment.GetEnvironmentVariable("Database__Provider") ?? "sqlserver")
            .Trim()
            .ToLowerInvariant();

        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? (provider is "postgres" or "postgresql"
                ? "Host=localhost;Port=5432;Database=JSO;Username=jso;Password=jso"
                : "Server=localhost,1433;Database=JSO;User Id=sa;Password=CHANGE_ME;TrustServerCertificate=True;Encrypt=False");

        var options = new DbContextOptionsBuilder<JsoDbContext>();

        switch (provider)
        {
            case "postgres":
            case "postgresql":
                options.UseNpgsql(connectionString);
                break;
            case "sqlserver":
                options.UseSqlServer(connectionString);
                break;
            default:
                throw new InvalidOperationException(
                    $"Unsupported database provider '{provider}'. Use 'sqlserver' or 'postgres'.");
        }

        return new JsoDbContext(options.Options);
    }
}
