namespace JSO.Domain;

public sealed class ArticleMetadata
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ArticleId { get; set; }
    public string? AuthorName { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
