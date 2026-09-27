namespace JSO.Domain;

// Downloadable club document (idea: comuniqués, règlements, formulaires).
// The file itself is uploaded elsewhere; this entity only stores its public URL
// together with a title, an optional category and a publication flag.
public sealed class ClubDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Human-readable title of the document (required).
    public string Title { get; set; } = null!;

    // Optional category, e.g. "Communiqué" / "Règlement" / "Formulaire".
    public string? Category { get; set; }

    // Public URL of the already-uploaded file (required).
    public string FileUrl { get; set; } = null!;

    // Only published documents are visible on the public endpoint. Defaults to
    // false so nothing leaks before an admin reviews it.
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
