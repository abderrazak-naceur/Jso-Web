namespace JSO.Domain;

// Editable navigation entry for the public site header/footer (idea:
// "Homepage Builder & Menu/Footer editabili"). The club manages menu links
// without touching code. Only active items are exposed publicly, filtered by
// Position and ordered by DisplayOrder.
public sealed class NavigationItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Label { get; set; } = null!;
    public string Url { get; set; } = null!;
    public string Position { get; set; } = "Header";
    public int DisplayOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public bool OpensInNewTab { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
