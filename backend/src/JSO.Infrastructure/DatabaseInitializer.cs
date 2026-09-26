using JSO.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace JSO.Infrastructure;

public sealed class DatabaseInitializer(
    JsoDbContext db,
    IHostEnvironment environment,
    IConfiguration configuration,
    ILogger<DatabaseInitializer> logger)
{
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        if (environment.IsDevelopment())
        {
            await DevelopmentDataSeeder.SeedAsync(db, logger, configuration, ct);
            return;
        }

        await db.Database.MigrateAsync(ct);
        logger.LogInformation("JSO database migrations applied successfully.");

        if (await db.AdminUsers.AnyAsync(ct))
            return;

        var email = configuration["ADMIN_BOOTSTRAP_EMAIL"]?.Trim().ToLowerInvariant();
        var password = configuration["ADMIN_BOOTSTRAP_PASSWORD"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password) || password.Length < 12)
            throw new InvalidOperationException(
                "Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (at least 12 characters) for the first production start.");

        db.AdminUsers.Add(new AdminUser
        {
            Email = email,
            DisplayName = "JSO Administrator",
            PasswordHash = PasswordHasher.Hash(password),
            Role = "SuperAdmin",
            IsActive = true
        });
        await db.SaveChangesAsync(ct);
        logger.LogInformation("JSO production bootstrap administrator created.");
    }
}
