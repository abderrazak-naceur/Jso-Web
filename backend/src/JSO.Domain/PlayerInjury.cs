namespace JSO.Domain;

// Injury and availability register for a player (idea C8).
// Health data is a special category under GDPR: access is restricted by role,
// writes are audited and the model is minimised (Notes is free text but optional,
// no clinical detail is required). Never exposed on a public endpoint.
public sealed class PlayerInjury
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlayerId { get; set; }
    public string Type { get; set; } = null!;
    public DateOnly StartDate { get; set; }
    public DateOnly? ExpectedReturn { get; set; }
    public string Status { get; set; } = "Active";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
