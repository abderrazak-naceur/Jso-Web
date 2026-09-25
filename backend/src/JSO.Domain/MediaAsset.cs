namespace JSO.Domain;

public sealed class MediaAsset
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = null!;
    public string Url { get; set; } = null!;
    public string Type { get; set; } = "Image";
    public string? ThumbnailUrl { get; set; }
    public string? Caption { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long? FileSize { get; set; }
    public string? StoragePath { get; set; }
}
