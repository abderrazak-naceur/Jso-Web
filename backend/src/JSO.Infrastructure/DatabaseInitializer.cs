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

        var email = configuration["ADMIN_BOOTSTRAP_EMAIL"]?.Trim().ToLowerInvariant();
        var password = configuration["ADMIN_BOOTSTRAP_PASSWORD"];
        var resetBootstrapPassword = string.Equals(
            configuration["ADMIN_BOOTSTRAP_RESET_PASSWORD"],
            "true",
            StringComparison.OrdinalIgnoreCase);

        var hasAdmin = await db.AdminUsers.AnyAsync(ct);

        var roster = new[]
        {
            new { FirstName = "Aymen", LastName = "Ben Saïd", ShirtNumber = 1, Position = "Gardien", Photo = "/players/aymen-ben-said.png" },
            new { FirstName = "Hamza", LastName = "Trabelsi", ShirtNumber = 2, Position = "Défenseur", Photo = "/players/hamza-trabelsi.png" },
            new { FirstName = "Mohamed", LastName = "Hachani", ShirtNumber = 4, Position = "Défenseur", Photo = "/players/mohamed-hachani.png" },
            new { FirstName = "Oussama", LastName = "Belhadj", ShirtNumber = 5, Position = "Défenseur", Photo = "/players/oussama-belhadj.png" },
            new { FirstName = "Nidhal", LastName = "Gharbi", ShirtNumber = 6, Position = "Milieu", Photo = "/players/nidhal-gharbi.png" },
            new { FirstName = "Firas", LastName = "Ayari", ShirtNumber = 7, Position = "Milieu", Photo = "/players/firas-ayari.png" },
            new { FirstName = "Yassine", LastName = "Dridi", ShirtNumber = 8, Position = "Milieu", Photo = "/players/yassine-dridi.png" },
            new { FirstName = "Khalil", LastName = "Jebali", ShirtNumber = 10, Position = "Attaquant", Photo = "/players/khalil-jebali.png" },
            new { FirstName = "Seif", LastName = "Mansouri", ShirtNumber = 11, Position = "Attaquant", Photo = "/players/seif-mansouri.png" },
            new { FirstName = "Wassim", LastName = "Ferchichi", ShirtNumber = 9, Position = "Attaquant", Photo = "/players/wassim-ferchichi.png" }
        };

        foreach (var item in roster)
        {
            var player = await db.Players.SingleOrDefaultAsync(
                x => x.TeamId == team.Id && x.FirstName == item.FirstName && x.LastName == item.LastName,
                ct);

            if (player is null)
            {
                db.Players.Add(new Player
                {
                    TeamId = team.Id,
                    FirstName = item.FirstName,
                    LastName = item.LastName,
                    ShirtNumber = item.ShirtNumber,
                    Position = item.Position,
                    PhotoUrl = item.Photo,
                    IsActive = true
                });
            }
            else
            {
                player.ShirtNumber = item.ShirtNumber;
                player.Position = item.Position;
                player.PhotoUrl = item.Photo;
                player.IsActive = true;
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("JSO production player roster is ready: {Count} players.", roster.Length);

        if (hasAdmin)
        {
            // One-time recovery path for an operator who needs to restore the
            // bootstrap credentials in an already-initialized production DB.
            // It is explicitly opt-in so normal restarts never overwrite a
            // changed administrator password.
            if (resetBootstrapPassword)
            {
                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password) || password.Length < 12)
                    throw new InvalidOperationException(
                        "ADMIN_BOOTSTRAP_RESET_PASSWORD=true requires ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD (at least 12 characters).");

                var user = await db.AdminUsers.SingleOrDefaultAsync(x => x.Email == email, ct);
                if (user is null)
                {
                    db.AdminUsers.Add(new AdminUser
                    {
                        Email = email,
                        DisplayName = "JSO Administrator",
                        PasswordHash = PasswordHasher.Hash(password),
                        Role = "SuperAdmin",
                        IsActive = true
                    });
                }
                else
                {
                    user.PasswordHash = PasswordHasher.Hash(password);
                    user.IsActive = true;
                    user.Role = "SuperAdmin";
                    user.DisplayName = string.IsNullOrWhiteSpace(user.DisplayName)
                        ? "JSO Administrator"
                        : user.DisplayName;
                }

                await db.SaveChangesAsync(ct);
                logger.LogWarning("JSO bootstrap administrator password reset from explicit production recovery configuration.");
            }

            return;
        }

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
