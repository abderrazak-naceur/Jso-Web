namespace JSO.Domain;

// Reusable matchday checklist template item (idea D14). These are the standard
// operational steps (impianto pronto, biglietteria aperta, live blog attivo,
// social programmati, ...) that can be materialised onto any match.
public sealed class MatchdayChecklistTemplateItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Label { get; set; } = null!;
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// Concrete checklist item attached to a specific match. Generated from the active
// template items (idempotent by Label) or added manually. AssigneeAdminId is the
// optional responsible admin. No fan/personal data is stored here.
public sealed class MatchdayChecklistItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public string Label { get; set; } = null!;
    public bool Done { get; set; }
    public Guid? AssigneeAdminId { get; set; }
    public int DisplayOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
