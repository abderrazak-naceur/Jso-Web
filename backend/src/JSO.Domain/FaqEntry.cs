namespace JSO.Domain;

// Public FAQ entry (idea: domande frequenti pubbliche gestite dall'admin).
// Additive and self-contained: only published entries are exposed publicly,
// ordered by SortOrder then CreatedAt, optionally filtered by Category.
public sealed class FaqEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Question { get; set; } = null!;
    public string Answer { get; set; } = null!;
    public string? Category { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
