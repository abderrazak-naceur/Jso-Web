using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JSO.Infrastructure;

public sealed class DatabaseInitializer(
    JsoDbContext db,
    IHostEnvironment environment,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        if (environment.IsDevelopment())
        {
            await DevelopmentDataSeeder.SeedAsync(db, logger, environment.Configuration, ct);
            return;
        }

        await db.Database.MigrateAsync(ct);
        logger.LogInformation("JSO database migrations applied successfully.");
    }
}
