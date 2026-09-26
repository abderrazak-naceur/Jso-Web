namespace JSO.Domain;

public sealed class LiveBlogEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public int? Minute { get; set; }
    public string Kind { get; set; } = "Text";
    public string Body { get; set; } = null!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsPinned { get; set; }
}
