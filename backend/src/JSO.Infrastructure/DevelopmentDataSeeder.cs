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

        // Give the club a rich public description + crest so the hero and club
        // sections read like a real site instead of empty placeholders.
        if (string.IsNullOrWhiteSpace(club.Description))
            club.Description = "Fondée en 1973, la Jeunesse Sportive de Oudhref est bien plus qu’un club : "
                + "c’est l’identité d’une ville et la fierté de toute une communauté. Formation des jeunes, "
                + "esprit collectif et passion du maillot guident chaque saison.";
        if (string.IsNullOrWhiteSpace(club.LogoUrl))
            club.LogoUrl = "/JSO-crest-regenerated-ok.png";

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
            // Real player portraits (background removed) served by the frontend
            // from frontend/public/players/<slug>.png.
            static string LocalPhoto(string slug) => $"/players/{slug}.png";

            db.Players.AddRange(
                new Player { TeamId = team.Id, FirstName = "Aymen", LastName = "Ben Saïd", ShirtNumber = 1, Position = "Gardien", PhotoUrl = LocalPhoto("aymen-ben-said") },
                new Player { TeamId = team.Id, FirstName = "Hamza", LastName = "Trabelsi", ShirtNumber = 2, Position = "Défenseur", PhotoUrl = LocalPhoto("hamza-trabelsi") },
                new Player { TeamId = team.Id, FirstName = "Mohamed", LastName = "Hachani", ShirtNumber = 4, Position = "Défenseur", PhotoUrl = LocalPhoto("mohamed-hachani") },
                new Player { TeamId = team.Id, FirstName = "Oussama", LastName = "Belhadj", ShirtNumber = 5, Position = "Défenseur", PhotoUrl = LocalPhoto("oussama-belhadj") },
                new Player { TeamId = team.Id, FirstName = "Yassine", LastName = "Dridi", ShirtNumber = 8, Position = "Milieu", PhotoUrl = LocalPhoto("yassine-dridi") },
                new Player { TeamId = team.Id, FirstName = "Nidhal", LastName = "Gharbi", ShirtNumber = 6, Position = "Milieu", PhotoUrl = LocalPhoto("nidhal-gharbi") },
                new Player { TeamId = team.Id, FirstName = "Firas", LastName = "Ayari", ShirtNumber = 7, Position = "Milieu", PhotoUrl = LocalPhoto("firas-ayari") },
                new Player { TeamId = team.Id, FirstName = "Khalil", LastName = "Jebali", ShirtNumber = 10, Position = "Attaquant", PhotoUrl = LocalPhoto("khalil-jebali") },
                new Player { TeamId = team.Id, FirstName = "Seif", LastName = "Mansouri", ShirtNumber = 11, Position = "Attaquant", PhotoUrl = LocalPhoto("seif-mansouri") },
                new Player { TeamId = team.Id, FirstName = "Wassim", LastName = "Ferchichi", ShirtNumber = 9, Position = "Attaquant", PhotoUrl = LocalPhoto("wassim-ferchichi") }
            );
        }

        if (!await db.StaffMembers.AnyAsync(x => x.TeamId == team.Id, ct))
        {
            static string StaffAvatar(string seed) =>
                "https://api.dicebear.com/7.x/avataaars/png"
                + $"?seed={Uri.EscapeDataString(seed)}&backgroundColor=1769e0&size=256";

            db.StaffMembers.AddRange(
                new StaffMember { TeamId = team.Id, Name = "Lotfi Bouzid", Role = "Entraîneur principal", PhotoUrl = StaffAvatar("Lotfi Bouzid") },
                new StaffMember { TeamId = team.Id, Name = "Sami Khemiri", Role = "Entraîneur adjoint", PhotoUrl = StaffAvatar("Sami Khemiri") },
                new StaffMember { TeamId = team.Id, Name = "Dr. Nadia Slama", Role = "Médecin du club", PhotoUrl = StaffAvatar("Nadia Slama") }
            );
        }

        // Official 2026/27 fixture list supplied by the club (9 rounds).
        // The source image does not contain kickoff dates/times, so we use the
        // season's provisional weekly Sundays until the federation publishes the
        // exact dates. Results remain empty until an administrator records them.
        var officialMatches = new (int Round, string Opponent, bool IsHome)[]
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

        var legacyOpponents = new[] { "US Monastir", "Stade Gabésien", "AS Gabès", "CS Hammam-Lif", "El Gawafel Gafsa" };
        var legacyMatches = await db.Matches.Where(x => x.TeamId == team.Id && legacyOpponents.Contains(x.OpponentName)).ToListAsync(ct);
        if (legacyMatches.Count > 0)
            db.Matches.RemoveRange(legacyMatches);

        foreach (var fixture in officialMatches)
        {
            if (await db.Matches.AnyAsync(x => x.TeamId == team.Id && x.SeasonId == season.Id && x.OpponentName == fixture.Opponent && x.IsHome == fixture.IsHome, ct))
                continue;

            var provisionalDate = new DateTimeOffset(2026, 9, 20, 15, 0, 0, TimeSpan.Zero).AddDays((fixture.Round - 1) * 7);
            db.Matches.Add(new Match
            {
                SeasonId = season.Id,
                CompetitionId = competition.Id,
                TeamId = team.Id,
                OpponentName = fixture.Opponent,
                KickoffAt = provisionalDate,
                Venue = fixture.IsHome ? "Stade d'Oudhref" : "À confirmer",
                IsHome = fixture.IsHome,
                Status = "Scheduled",
                IsPublished = true
            });
        }

        if (!await db.Articles.AnyAsync(ct))
        {
            db.Articles.AddRange(
                new Article
                {
                    Title = "Victoire nette face à El Gawafel Gafsa",
                    Slug = "victoire-nette-face-a-el-gawafel-gafsa",
                    Excerpt = "Portée par son public, la JSO s’impose 3-0 dans un match maîtrisé de bout en bout.",
                    Body = "Devant un Stade d’Oudhref plein, l’équipe première a livré l’une de ses meilleures prestations "
                        + "de la saison. Un premier acte sérieux, une seconde période appliquée : la JSO confirme sa dynamique.",
                    Status = "Published",
                    CoverImageUrl = "https://picsum.photos/seed/jso-match-win/1200/675",
                    PublishedAt = DateTimeOffset.UtcNow.AddDays(-3)
                },
                new Article
                {
                    Title = "Une nouvelle identité digitale pour JSO",
                    Slug = "une-nouvelle-identite-digitale-pour-jso",
                    Excerpt = "La maison digitale de la Jeunesse Sportive de Oudhref entre dans une nouvelle étape.",
                    Body = "Bienvenue sur la nouvelle plateforme officielle de la Jeunesse Sportive de Oudhref : "
                        + "matchs, actualités, boutique et vie du club réunis au même endroit.",
                    Status = "Published",
                    CoverImageUrl = "https://picsum.photos/seed/jso-digital/1200/675",
                    PublishedAt = DateTimeOffset.UtcNow.AddDays(-2)
                },
                new Article
                {
                    Title = "Tout suivre au même endroit",
                    Slug = "tout-suivre-au-meme-endroit",
                    Excerpt = "Calendrier, résultats et informations de match réunis dans un seul espace.",
                    Body = "Le Match Center rassemble les informations essentielles autour des rencontres : "
                        + "compositions, événements du match et statistiques.",
                    Status = "Published",
                    PublishedAt = DateTimeOffset.UtcNow.AddDays(-1)
                },
                new Article
                {
                    Title = "Construire la relève d'Oudhref",
                    Slug = "construire-la-releve-d-oudhref",
                    Excerpt = "La formation et les jeunes joueurs sont au cœur du projet JSO.",
                    Body = "Le club poursuit son ambition de développer les talents locaux et d’offrir un cadre "
                        + "d’excellence aux jeunes de la région.",
                    Status = "Published",
                    PublishedAt = DateTimeOffset.UtcNow
                }
            );
        }

        if (!await db.MediaAssets.AnyAsync(ct))
        {
            db.MediaAssets.AddRange(
                new MediaAsset { Title = "Nuit de match au Stade d’Oudhref", Url = "/jso-stadium-hero.png", ThumbnailUrl = "/jso-stadium-hero.png", Type = "Image", Caption = "L’ambiance des soirs de match à domicile.", IsPublished = true },
                new MediaAsset { Title = "Les couleurs de la JSO", Url = "/team-hero.svg", ThumbnailUrl = "/team-hero.svg", Type = "Image", Caption = "Maillot et écharpe, la fierté d’Oudhref.", IsPublished = true },
                new MediaAsset { Title = "Le blason du club", Url = "/JSO-crest-regenerated-ok.png", ThumbnailUrl = "/JSO-crest-regenerated-ok.png", Type = "Image", Caption = "Depuis 1973.", IsPublished = true }
            );
        }

        if (!await db.Sponsors.AnyAsync(ct))
        {
            // DEMO ONLY: logos and two wide advertising banners from picsum.photos
            // (free images) just to test the sponsor banner display. These depend
            // on an external host; the club replaces them with real assets from
            // the admin (Sponsor.LogoUrl / Sponsor.BannerImageUrl).
            db.Sponsors.AddRange(
                new Sponsor { Name = "Délice Danone", Tier = "Principal", Placement = "Footer", WebsiteUrl = "https://www.delice.tn", Priority = 100, IsActive = true, LogoUrl = "https://picsum.photos/seed/jso-sp-delice/220/90", BannerImageUrl = "https://picsum.photos/seed/jso-banner-delice/1200/240" },
                new Sponsor { Name = "Tunisie Telecom", Tier = "Officiel", Placement = "Footer", WebsiteUrl = "https://www.tunisietelecom.tn", Priority = 90, IsActive = true, LogoUrl = "https://picsum.photos/seed/jso-sp-tt/220/90", BannerImageUrl = "https://picsum.photos/seed/jso-banner-tt/1200/240" },
                new Sponsor { Name = "Biat", Tier = "Officiel", Placement = "Footer", WebsiteUrl = "https://www.biat.com.tn", Priority = 80, IsActive = true, LogoUrl = "https://picsum.photos/seed/jso-sp-biat/220/90" },
                new Sponsor { Name = "STEG", Tier = "Partenaire", Placement = "Footer", Priority = 70, IsActive = true, LogoUrl = "https://picsum.photos/seed/jso-sp-steg/220/90" },
                new Sponsor { Name = "Ville d’Oudhref", Tier = "Institutionnel", Placement = "Footer", Priority = 60, IsActive = true, LogoUrl = "https://picsum.photos/seed/jso-sp-ville/220/90" }
            );
        }

        if (!await db.Products.AnyAsync(ct))
        {
            db.Products.AddRange(
                new Product { Name = "Maillot Domicile 2026/27", Slug = "maillot-domicile-2026-27", Description = "Le maillot officiel domicile de la saison, floqué JSO.", Price = 79.90m, Currency = "TND", Category = "Maillots", ImageUrl = "/jersey.svg", Stock = 40, IsActive = true },
                new Product { Name = "Maillot Extérieur 2026/27", Slug = "maillot-exterieur-2026-27", Description = "Le maillot officiel extérieur, léger et respirant.", Price = 79.90m, Currency = "TND", Category = "Maillots", ImageUrl = "/jersey.svg", Stock = 30, IsActive = true },
                new Product { Name = "Écharpe Supporter", Slug = "echarpe-supporter", Description = "L’écharpe aux couleurs du club pour les soirs de match.", Price = 24.90m, Currency = "TND", Category = "Accessoires", ImageUrl = "/scarf.svg", Stock = 100, IsActive = true },
                new Product { Name = "Casquette JSO", Slug = "casquette-jso", Description = "Casquette brodée du blason JSO.", Price = 19.90m, Currency = "TND", Category = "Accessoires", ImageUrl = "/cap.svg", Stock = 60, IsActive = true },
                new Product { Name = "Hoodie Officiel", Slug = "hoodie-officiel", Description = "Sweat à capuche confortable aux couleurs du club.", Price = 89.90m, Currency = "TND", Category = "Textile", ImageUrl = "/hoodie.svg", Stock = 25, IsActive = true },
                new Product { Name = "Maillot Édition Anniversaire", Slug = "maillot-edition-anniversaire", Description = "Édition spéciale célébrant l’histoire du club depuis 1973.", Price = 99.90m, Currency = "TND", Category = "Maillots", ImageUrl = "/jersey.svg", Stock = 0, IsActive = true }
            );
        }

        if (!await db.ClubEvents.AnyAsync(ct))
        {
            // Build day+hour instants in UTC: PostgreSQL 'timestamp with time
            // zone' only accepts offset 0, and DateTime.Date drops the offset.
            static DateTimeOffset UtcDayAt(int addDays, int hour)
            {
                var day = DateTime.UtcNow.Date.AddDays(addDays).AddHours(hour);
                return new DateTimeOffset(day, TimeSpan.Zero);
            }
            db.ClubEvents.AddRange(
                new ClubEvent { Title = "Assemblée générale annuelle", Slug = "assemblee-generale-2026", Description = "Réunion annuelle des membres et bilan de la saison.", StartAt = UtcDayAt(20, 18), Location = "Club house — Oudhref", IsPublished = true },
                new ClubEvent { Title = "Entraînement ouvert au public", Slug = "entrainement-ouvert-octobre", Description = "Venez encourager l’équipe première lors d’une séance ouverte.", StartAt = UtcDayAt(5, 17), Location = "Stade d’Oudhref", IsPublished = true },
                new ClubEvent { Title = "Journée portes ouvertes de l’école de foot", Slug = "portes-ouvertes-ecole-foot", Description = "Découverte des catégories jeunes et inscriptions.", StartAt = UtcDayAt(12, 9), EndAt = UtcDayAt(12, 13), Location = "Complexe sportif d’Oudhref", IsPublished = true }
            );
        }

        if (!await db.FaqEntries.AnyAsync(ct))
        {
            db.FaqEntries.AddRange(
                new FaqEntry { Question = "Comment acheter un billet pour un match ?", Answer = "La billetterie en ligne ouvre quelques jours avant chaque rencontre à domicile depuis la section Matchs.", Category = "Billetterie", SortOrder = 1, IsPublished = true },
                new FaqEntry { Question = "Où se trouve le stade ?", Answer = "Le Stade d’Oudhref est situé à Oudhref, dans le gouvernorat de Gabès. L’itinéraire est disponible dans la section Infos pratiques.", Category = "Accès", SortOrder = 2, IsPublished = true },
                new FaqEntry { Question = "Comment inscrire mon enfant à l’école de foot ?", Answer = "Les inscriptions se font lors des journées portes ouvertes ou directement auprès du club. Consultez l’Agenda pour les prochaines dates.", Category = "École de foot", SortOrder = 3, IsPublished = true },
                new FaqEntry { Question = "Comment devenir partenaire du club ?", Answer = "Contactez la direction via l’adresse officielle du club pour recevoir le dossier de partenariat.", Category = "Partenaires", SortOrder = 4, IsPublished = true }
            );
        }

        if (!await db.ClubDocuments.AnyAsync(ct))
        {
            db.ClubDocuments.AddRange(
                new ClubDocument { Title = "Règlement intérieur du club", Category = "Règlement", FileUrl = "/documents/reglement-interieur.pdf", IsPublished = true },
                new ClubDocument { Title = "Formulaire d’adhésion 2026/27", Category = "Formulaire", FileUrl = "/documents/formulaire-adhesion.pdf", IsPublished = true },
                new ClubDocument { Title = "Charte du supporter", Category = "Communiqué", FileUrl = "/documents/charte-supporter.pdf", IsPublished = true }
            );
        }

        if (!await db.CommunityPrograms.AnyAsync(ct))
        {
            var now = DateTimeOffset.UtcNow;
            db.CommunityPrograms.AddRange(
                new CommunityProgram { Title = "Foot à l’école", PartnerName = "Écoles primaires d’Oudhref", Description = "Initiation au football et aux valeurs du sport pour les élèves de la région.", StartDate = now.AddMonths(-1), IsPublished = true },
                new CommunityProgram { Title = "Tournoi inter-quartiers", PartnerName = "Municipalité d’Oudhref", Description = "Un tournoi convivial qui rassemble les quartiers autour du club.", StartDate = now.AddDays(30), IsPublished = true },
                new CommunityProgram { Title = "JSO Solidarité", PartnerName = "Croissant-Rouge local", Description = "Actions solidaires et collectes menées avec nos partenaires locaux.", StartDate = now.AddMonths(-3), IsPublished = true }
            );
        }

        if (!await db.ArchiveItems.AnyAsync(ct))
        {
            db.ArchiveItems.AddRange(
                new ArchiveItem { Year = 1973, Category = "Milestone", Title = "Fondation du club", Body = "Naissance de la Jeunesse Sportive de Oudhref, portée par la passion d’une ville.", DisplayOrder = 1, IsPublished = true },
                new ArchiveItem { Year = 1998, Category = "Trophy", Title = "Une saison historique", Body = "L’une des saisons les plus marquantes de l’histoire du club.", DisplayOrder = 1, IsPublished = true },
                new ArchiveItem { Year = 2015, Category = "Photo", Title = "Le stade en fête", Body = "Retour en images sur une soirée mémorable au Stade d’Oudhref.", DisplayOrder = 1, IsPublished = true }
            );
        }

        // Persist the matches/players created above so their Ids are available
        // for the match-detail seed (events, lineup, officials, stats, live blog).
        await db.SaveChangesAsync(ct);

        // Rich Match Center data so Résumé/Compos/Stats/Direct are not empty.
        var lastWin = await db.Matches
            .FirstOrDefaultAsync(x => x.TeamId == team.Id && x.OpponentName == "AS Gabès", ct);
        // The next published home fixture (soonest upcoming) drives the live blog seed.
        var nextMatch = await db.Matches
            .Where(x => x.TeamId == team.Id && x.IsPublished && x.Status == "Scheduled")
            .OrderBy(x => x.KickoffAt)
            .FirstOrDefaultAsync(ct);
        var roster = await db.Players.Where(x => x.TeamId == team.Id)
            .OrderBy(x => x.ShirtNumber).ToListAsync(ct);

        if (lastWin is not null && !await db.MatchEvents.AnyAsync(x => x.MatchId == lastWin.Id, ct))
        {
            db.MatchEvents.AddRange(
                new MatchEvent { MatchId = lastWin.Id, Minute = 18, Type = "Goal", PlayerName = "Khalil Jebali", Team = "Home", Notes = "Ouverture du score sur une belle action collective." },
                new MatchEvent { MatchId = lastWin.Id, Minute = 34, Type = "YellowCard", PlayerName = "Hamza Trabelsi", Team = "Home" },
                new MatchEvent { MatchId = lastWin.Id, Minute = 57, Type = "Goal", PlayerName = "Wassim Ferchichi", Team = "Home", Notes = "Doublé du score après un contre rapide." },
                new MatchEvent { MatchId = lastWin.Id, Minute = 72, Type = "Goal", PlayerName = "AS Gabès", Team = "Away", Notes = "Réduction du score sur penalty." },
                new MatchEvent { MatchId = lastWin.Id, Minute = 80, Type = "Substitution", PlayerName = "Seif Mansouri", SecondaryPlayerName = "Firas Ayari", Team = "Home" }
            );

            if (roster.Count > 0)
            {
                // Most of the squad starts; any extra players sit on the bench.
                var starterCount = Math.Min(11, roster.Count);
                for (var i = 0; i < roster.Count; i++)
                {
                    var isSub = i >= starterCount;
                    db.MatchLineups.Add(new MatchLineup
                    {
                        MatchId = lastWin.Id,
                        PlayerId = roster[i].Id,
                        Role = isSub ? "Substitute" : "Starter",
                        PositionOrder = isSub ? null : i,
                        Position = roster[i].Position,
                        IsCaptain = i == 0,
                        IsSubstitute = isSub
                    });
                }
            }

            db.MatchOfficials.AddRange(
                new MatchOfficial { MatchId = lastWin.Id, Name = "Sofiene Jerbi", Role = "Referee" },
                new MatchOfficial { MatchId = lastWin.Id, Name = "Marouen Sassi", Role = "Assistant" },
                new MatchOfficial { MatchId = lastWin.Id, Name = "Anis Ben Amor", Role = "Assistant" },
                new MatchOfficial { MatchId = lastWin.Id, Name = "Karim Zouari", Role = "Fourth" }
            );

            db.MatchStats.AddRange(
                new MatchStat { MatchId = lastWin.Id, Name = "Possession (%)", HomeValue = 58, AwayValue = 42 },
                new MatchStat { MatchId = lastWin.Id, Name = "Tirs", HomeValue = 14, AwayValue = 8 },
                new MatchStat { MatchId = lastWin.Id, Name = "Tirs cadrés", HomeValue = 7, AwayValue = 3 },
                new MatchStat { MatchId = lastWin.Id, Name = "Corners", HomeValue = 6, AwayValue = 2 },
                new MatchStat { MatchId = lastWin.Id, Name = "Fautes", HomeValue = 11, AwayValue = 15 }
            );
        }

        if (nextMatch is not null && !await db.LiveBlogEntries.AnyAsync(x => x.MatchId == nextMatch.Id, ct))
        {
            // Use a UTC instant: PostgreSQL 'timestamp with time zone' only
            // accepts DateTimeOffset values at offset 0.
            var now = DateTime.UtcNow;
            db.LiveBlogEntries.AddRange(
                new LiveBlogEntry { MatchId = nextMatch.Id, Kind = "Text", Body = "Bienvenue au Stade d’Oudhref pour le prochain match à domicile. Coup d’envoi dans quelques instants.", CreatedAt = new DateTimeOffset(now.AddMinutes(-5), TimeSpan.Zero), IsPinned = true },
                new LiveBlogEntry { MatchId = nextMatch.Id, Minute = 1, Kind = "Text", Body = "C’est parti ! La JSO donne le coup d’envoi.", CreatedAt = new DateTimeOffset(now.AddMinutes(-4), TimeSpan.Zero) }
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
