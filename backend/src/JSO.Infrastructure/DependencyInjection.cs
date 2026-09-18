using Microsoft.EntityFrameworkCore; using Microsoft.Extensions.Configuration; using Microsoft.Extensions.DependencyInjection;
namespace JSO.Infrastructure;
public static class DependencyInjection { public static IServiceCollection AddInfrastructure(this IServiceCollection services,IConfiguration configuration) { var cs=configuration.GetConnectionString("DefaultConnection") ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing."); services.AddDbContext<JsoDbContext>(o=>o.UseSqlServer(cs)); return services; } }
