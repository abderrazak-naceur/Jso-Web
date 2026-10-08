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

        var team = await db.Teams.FirstOrDefaultAsync(x => x.Name == "JSO - Équipe Première", ct);
        if (team is null)
        {
            team = new Team
            {
                Name = "JSO - Équipe Première",
                Category = "Senior",
                IsActive = true
            };
            db.Teams.Add(team);
            await db.SaveChangesAsync(ct);
        }

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

        // Official 2026/27 Group 2 fixture list supplied by the club/federation.
        // The source schedule image contains the round pairings but no kickoff
        // dates or times, so these are provisional weekly Sundays until the
        // federation publishes the exact dates. Existing administrator-entered
        // matches are never overwritten.
        var fixtureSeason = await db.Seasons.FirstOrDefaultAsync(x => x.Name == "2026/27", ct);
        if (fixtureSeason is null)
        {
            fixtureSeason = new Season { Name = "2026/27", IsActive = true };
            db.Seasons.Add(fixtureSeason);
        }

        var fixtureCompetition = await db.Competitions.FirstOrDefaultAsync(x => x.Name == "Championnat", ct);
        if (fixtureCompetition is null)
        {
            fixtureCompetition = new Competition
            {
                Name = "Championnat",
                Country = "Tunisie"
            };
            db.Competitions.Add(fixtureCompetition);
        }

        await db.SaveChangesAsync(ct);

        var officialFixtures = new (int Round, string Opponent, bool IsHome)[]
        {
            (1, "المستقبل الرياضي بحسي عمر", true),
            (2, "الاتحاد الرياضي المطوي", false),
            (3, "الاتحاد الرياضي الجرجيـسي", true),
            (4, "الأمل الرياضي بالرقبة", false),
            (5, "الملعب الرياضي بسيدي مخلوف", true),
            (6, "الوداد الرياضي بالجامعة", false),
            (7, "الجمعية الرياضية بالجامعة", false),
            (8, "جمعية أولمبيك بنقردان", true),
            (9, "النادي الرياضي ببئر العين", false)
        };

        var legacyOpponents = new[]
        {
            "US Monastir",
            "Stade Gabésien",
            "AS Gabès",
            "CS Hammam-Lif",
            "El Gawafel Gafsa"
        };
        var legacyMatches = await db.Matches
            .Where(x => x.TeamId == team.Id && legacyOpponents.Contains(x.OpponentName))
            .ToListAsync(ct);
        if (legacyMatches.Count > 0)
            db.Matches.RemoveRange(legacyMatches);

        foreach (var fixture in officialFixtures)
        {
            var exists = await db.Matches.AnyAsync(
                x => x.TeamId == team.Id
                    && x.SeasonId == fixtureSeason.Id
                    && x.OpponentName == fixture.Opponent
                    && x.IsHome == fixture.IsHome,
                ct);

            if (exists)
                continue;

            var provisionalDate = new DateTimeOffset(
                2026, 9, 20, 15, 0, 0, TimeSpan.Zero)
                .AddDays((fixture.Round - 1) * 7);

            db.Matches.Add(new Match
            {
                SeasonId = fixtureSeason.Id,
                CompetitionId = fixtureCompetition.Id,
                TeamId = team.Id,
                OpponentName = fixture.Opponent,
                KickoffAt = provisionalDate,
                Venue = fixture.IsHome ? "Stade d'Oudhref" : "À confirmer",
                IsHome = fixture.IsHome,
                Status = "Scheduled",
                IsPublished = true
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation(
            "JSO official 2026/27 fixtures are ready: {Count} rounds.",
            officialFixtures.Length);

        // Official annual supporter subscription shown on the 2026/27 card.
        // Seed only when missing so an administrator can safely edit the plan later.
        var annualMembership = await db.MembershipPlans.FirstOrDefaultAsync(
            x => x.Name == "Abonnement annuel 2026-2027", ct);
        if (annualMembership is null)
        {
            db.MembershipPlans.Add(new MembershipPlan
            {
                Name = "Abonnement annuel 2026-2027",
                Description = "Carte d'abonnement annuelle JSO pour la saison 2026-2027. Prix officiel : 30 dinars tunisiens.",
                Price = 30m,
                Currency = "TND",
                DurationDays = 365,
                IsActive = true,
                DisplayOrder = 0
            });
            await db.SaveChangesAsync(ct);
            logger.LogInformation("JSO annual membership plan 2026/27 created at 30 TND.");
        }

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
