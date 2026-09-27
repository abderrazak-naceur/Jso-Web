namespace JSO.Domain;

// Non-match club events for idea "Événements du club" (assemblées, entraînements
// ouverts, fêtes). Kept in its own file to stay conflict-free from Entities.cs.
// Slug is unique and powers the public GET /api/events/{slug} lookup. EndAt is
// optional; when present it must be on or after StartAt.
public sealed class ClubEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset? EndAt { get; set; }
    public string? Location { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
