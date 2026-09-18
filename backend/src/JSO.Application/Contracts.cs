namespace JSO.Application;
public sealed record ClubDto(Guid Id, string Name, string ShortName, string Country, string City, string? Description, string? LogoUrl);
public sealed record MatchDto(Guid Id, string OpponentName, DateTimeOffset KickoffAt, string? Venue, bool IsHome, int? HomeScore, int? AwayScore, string Status);
public sealed record ArticleDto(Guid Id, string Title, string Slug, string Excerpt, string Status, DateTimeOffset? PublishedAt, string? CoverImageUrl);
