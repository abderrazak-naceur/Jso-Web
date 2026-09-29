namespace JSO.Domain;

public sealed class Club { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = "Jeunesse Sportive de Oudhref"; public string ShortName { get; set; } = "JSO"; public string Country { get; set; } = "Tunisie"; public string City { get; set; } = "Oudhref"; public string? Description { get; set; } public string? LogoUrl { get; set; } }
public sealed class Season { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; public bool IsActive { get; set; } }
public sealed class Competition { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; public string? Country { get; set; } }
public sealed class Team { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; public string Category { get; set; } = null!; public bool IsActive { get; set; } = true; }
public sealed class Player { public Guid Id { get; set; } = Guid.NewGuid(); public Guid TeamId { get; set; } public string FirstName { get; set; } = null!; public string LastName { get; set; } = null!; public int? ShirtNumber { get; set; } public string? Position { get; set; } public string? PhotoUrl { get; set; } public bool IsActive { get; set; } = true; }
public sealed class StaffMember { public Guid Id { get; set; } = Guid.NewGuid(); public Guid TeamId { get; set; } public string Name { get; set; } = null!; public string Role { get; set; } = null!; public string? PhotoUrl { get; set; } public bool IsActive { get; set; } = true; }
public sealed class Match { public Guid Id { get; set; } = Guid.NewGuid(); public Guid SeasonId { get; set; } public Guid CompetitionId { get; set; } public Guid TeamId { get; set; } public string OpponentName { get; set; } = null!; public DateTimeOffset KickoffAt { get; set; } public string? Venue { get; set; } public bool IsHome { get; set; } public int? HomeScore { get; set; } public int? AwayScore { get; set; } public string Status { get; set; } = "Scheduled"; public bool IsPublished { get; set; } }
public sealed class MatchEvent { public Guid Id { get; set; } = Guid.NewGuid(); public Guid MatchId { get; set; } public int Minute { get; set; } public string Type { get; set; } = null!; public string? PlayerName { get; set; } public string? SecondaryPlayerName { get; set; } public string? Team { get; set; } public string? Notes { get; set; } }
public sealed class Article { public Guid Id { get; set; } = Guid.NewGuid(); public string Title { get; set; } = null!; public string Slug { get; set; } = null!; public string Excerpt { get; set; } = null!; public string Body { get; set; } = null!; public string Status { get; set; } = "Draft"; public DateTimeOffset? PublishedAt { get; set; } public string? CoverImageUrl { get; set; } public DateTimeOffset? ScheduledAt { get; set; } public string EditorialStatus { get; set; } = "Draft"; }
// ActivationSlug supports idea B5 (activation sponsor via QR allo stadio).
// It is nullable and additive: existing sponsors keep working with no backfill.
// When set, it is unique and powers the public tracked landing
// GET /api/sponsors/activation/{slug} that records an anonymous scan and
// redirects to WebsiteUrl. No personal data is involved: only the slug.
public sealed class Sponsor { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; public string? LogoUrl { get; set; } public string? WebsiteUrl { get; set; } public string Tier { get; set; } = "Partner"; public string Placement { get; set; } = "Footer"; public DateTimeOffset? StartDate { get; set; } public DateTimeOffset? EndDate { get; set; } public bool IsActive { get; set; } = true; public int Priority { get; set; } public string? ActivationSlug { get; set; } public string? BannerImageUrl { get; set; } }
// SponsorActivation records a single anonymous QR scan for idea B5.
// Privacy by design: it stores only the sponsor reference, an optional coarse
// Channel bucket ("Stadium"/"Program") and the scan timestamp. No IP address,
// no user identifier, no user agent, no PII of any kind is ever persisted, so
// scans are only ever aggregatable (counts per day / per channel), never
// attributable to an individual.
public sealed class SponsorActivation { public Guid Id { get; set; } = Guid.NewGuid(); public Guid SponsorId { get; set; } public string? Channel { get; set; } public DateTimeOffset ScannedAt { get; set; } = DateTimeOffset.UtcNow; }
public sealed class Product { public Guid Id { get; set; } = Guid.NewGuid(); public string Name { get; set; } = null!; public string Slug { get; set; } = null!; public string? Description { get; set; } public decimal Price { get; set; } public string Currency { get; set; } = "TND"; public string? ImageUrl { get; set; } public string? Category { get; set; } public int Stock { get; set; } public bool IsActive { get; set; } = true; public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; }
// BirthDate and AnniversaryOptIn support idea A3 (compleanni/anniversari tifoso).
// Both are nullable/opt-in and additive: no backfill of existing rows.
// CreatedAt already records the membership start date and doubles as
// "MemberSince" for the iscrizione-anniversary touchpoints, so we do not
// duplicate it. Privacy/GDPR: BirthDate is personal data processed only when
// the fan explicitly opts in (AnniversaryOptIn == true) and touchpoints only
// ever consider opted-in fans (data minimisation).
public sealed class FanUser { public Guid Id { get; set; } = Guid.NewGuid(); public string Email { get; set; } = null!; public string DisplayName { get; set; } = null!; public string PasswordHash { get; set; } = null!; public bool IsActive { get; set; } = true; public bool EmailVerified { get; set; } public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow; public DateTimeOffset? LastLoginAt { get; set; } public DateOnly? BirthDate { get; set; } public bool AnniversaryOptIn { get; set; } }
