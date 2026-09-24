using JSO.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace JSO.Infrastructure;

public static class DevelopmentDataSeeder
{
    public static async Task SeedAsync(JsoDbContext db, ILogger logger, IConfiguration configuration, CancellationToken ct = default)
    {
        await db.Database.EnsureCreatedAsync(ct);

        var bootstrapPassword = configuration["ADMIN_BOOTSTRAP_PASSWORD"];
        if (!string.IsNullOrWhiteSpace(bootstrapPassword) && !await db.AdminUsers.AnyAsync(ct))
        {
            db.AdminUsers.Add(new AdminUser
            {
                Email = configuration["ADMIN_BOOTSTRAP_EMAIL"]?.Trim().ToLowerInvariant() ?? "admin@jso.tn",
                DisplayName = "JSO Administrator",
                PasswordHash = PasswordHasher.Hash(bootstrapPassword),
                Role = "SuperAdmin",
                IsActive = true
            });
            await db.SaveChangesAsync(ct);
            logger.LogInformation("JSO bootstrap administrator created.");
        }

        var club = await db.Clubs.SingleAsync(x => x.ShortName == "JSO", ct);

        var season = await db.Seasons.FirstOrDefaultAsync(x => x.Name == "2026/27", ct);
        if (season is null)
        {
            season = new Season { Name = "2026/27", IsActive = true };
            db.Seasons.Add(season);
        }

        var competition = await db.Competitions.FirstOrDefaultAsync(x => x.Name == "Championnat", ct);
        if (competition is null)
        {
            competition = new Competition { Name = "Championnat", Country = "Tunisie" };
            db.Competitions.Add(competition);
        }

        await db.SaveChangesAsync(ct);

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

        if (!await db.Players.AnyAsync(x => x.TeamId == team.Id, ct))
        {
            db.Players.AddRange(
                new Player { TeamId = team.Id, FirstName = "Aymen", LastName = "Ben Saïd", ShirtNumber = 1, Position = "Gardien" },
                new Player { TeamId = team.Id, FirstName = "Mohamed", LastName = "Hachani", ShirtNumber = 4, Position = "Défenseur" },
                new Player { TeamId = team.Id, FirstName = "Yassine", LastName = "Dridi", ShirtNumber = 8, Position = "Milieu" },
                new Player { TeamId = team.Id, FirstName = "Khalil", LastName = "Jebali", ShirtNumber = 10, Position = "Attaquant" },
                new Player { TeamId = team.Id, FirstName = "Seif", LastName = "Mansouri", ShirtNumber = 11, Position = "Attaquant" }
            );
        }

        if (!await db.Matches.AnyAsync(x => x.TeamId == team.Id, ct))
        {
            var now = DateTimeOffset.UtcNow;
            db.Matches.AddRange(
                new Match
                {
                    SeasonId = season.Id,
                    CompetitionId = competition.Id,
                    TeamId = team.Id,
                    OpponentName = "Adversaire à confirmer",
                    KickoffAt = now.AddDays(7),
                    Venue = "Stade d'Oudhref",
                    IsHome = true,
                    Status = "Scheduled",
                    IsPublished = true
                },
                new Match
                {
                    SeasonId = season.Id,
                    CompetitionId = competition.Id,
                    TeamId = team.Id,
                    OpponentName = "AS Gabès",
                    KickoffAt = now.AddDays(-7),
                    Venue = "Stade d'Oudhref",
                    IsHome = true,
                    HomeScore = 2,
                    AwayScore = 1,
                    Status = "Finished",
                    IsPublished = true
                }
            );
        }

        if (!await db.Articles.AnyAsync(ct))
        {
            db.Articles.AddRange(
                new Article
                {
                    Title = "Une nouvelle identité digitale pour JSO",
                    Slug = "une-nouvelle-identite-digitale-pour-jso",
                    Excerpt = "La maison digitale de la Jeunesse Sportive de Oudhref entre dans une nouvelle étape.",
                    Body = "Bienvenue sur la nouvelle plateforme officielle de la Jeunesse Sportive de Oudhref.",
                    Status = "Published",
                    PublishedAt = DateTimeOffset.UtcNow.AddDays(-2)
                },
                new Article
                {
                    Title = "Tout suivre au même endroit",
                    Slug = "tout-suivre-au-meme-endroit",
                    Excerpt = "Calendrier, résultats et informations de match réunis dans un seul espace.",
                    Body = "Le Match Center rassemble les informations essentielles autour des rencontres.",
                    Status = "Published",
                    PublishedAt = DateTimeOffset.UtcNow.AddDays(-1)
                },
                new Article
                {
                    Title = "Construire la relève d'Oudhref",
                    Slug = "construire-la-releve-d-oudhref",
                    Excerpt = "La formation et les jeunes joueurs sont au cœur du projet JSO.",
                    Body = "Le club poursuit son ambition de développer les talents locaux.",
                    Status = "Published",
                    PublishedAt = DateTimeOffset.UtcNow
                }
            );
        }

        var defaultContent = new Dictionary<string, string>
        {
            ["hero_title"] = "Toujours plus haut.",
            ["hero_highlight"] = "Toujours JSO.",
            ["hero_description"] = "La maison digitale de la Jeunesse Sportive de Oudhref. Une plateforme pour vivre le club, suivre les matchs et partager la passion d’une ville.",
            ["club_eyebrow"] = "02 / LE CLUB",
            ["club_title"] = "Une histoire.",
            ["club_muted"] = "Une ville. Une passion.",
            ["news_eyebrow"] = "03 / NEWSROOM",
            ["news_title"] = "Le club",
            ["news_muted"] = "en mouvement."
        };

        foreach (var pair in defaultContent)
        {
            if (!await db.SiteContents.AnyAsync(x => x.Key == pair.Key, ct))
            {
                db.SiteContents.Add(new SiteContent { Key = pair.Key, Value = pair.Value, UpdatedBy = "system" });
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("JSO development data is ready for {Club}.", club.Name);
    }
}
