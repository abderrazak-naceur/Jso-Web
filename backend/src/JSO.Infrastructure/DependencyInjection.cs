using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JSO.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

        var provider = configuration["Database:Provider"]?.Trim().ToLowerInvariant() ?? "sqlserver";

        services.AddDbContext<JsoDbContext>(options =>
        {
            switch (provider)
            {
                case "postgres":
                case "postgresql":
                    options.UseNpgsql(cs);
                    break;
                case "sqlserver":
                    options.UseSqlServer(cs);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider '{provider}'. Use 'sqlserver' or 'postgres'.");
            }
        });

        return services;
    }
}
