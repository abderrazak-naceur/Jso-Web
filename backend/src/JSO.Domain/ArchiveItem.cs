namespace JSO.Domain;

// Digital museum / historical archive item (idea C10). Represents an evergreen
// piece of club heritage: a past season, a historic result, a period photo or an
// honours-board (albo d'oro) entry. Contains no sensitive personal data.
public sealed class ArchiveItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Optional year the item refers to (e.g. season/event year). Nullable so items
    // without a precise date (thematic entries) can still be archived.
    public int? Year { get; set; }

    // Free-form category, e.g. "Trophy", "Photo", "Milestone", "Season".
    public string Category { get; set; } = null!;

    public string Title { get; set; } = null!;

    // Long-form descriptive text (may be lengthy).
    public string Body { get; set; } = null!;

    // Logical FK to an existing MediaAsset for the associated image; reuses the
    // media storage instead of introducing new storage. Nullable.
    public Guid? MediaAssetId { get; set; }

    // Manual ordering within the same year; lower shows first.
    public int DisplayOrder { get; set; }

    public bool IsPublished { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
