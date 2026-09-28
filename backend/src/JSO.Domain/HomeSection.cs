namespace JSO.Domain;

// Homepage Builder section (idea: "Homepage Builder & Menu/Footer editabili").
// The club composes the public home page without touching code by ordering
// typed sections. PayloadJson stays an opaque JSON string validated at the API
// boundary; only published sections are exposed publicly, ordered by
// DisplayOrder. CustomHtml/Text payloads are NOT rendered as raw HTML by the
// clients (see controllers/frontend) to avoid XSS.
public sealed class HomeSection
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Type { get; set; } = null!;
    public string? Title { get; set; }
    public string? PayloadJson { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
