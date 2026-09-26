namespace JSO.Domain;

public sealed class Volunteer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public string? Contact { get; set; }
    public string Role { get; set; } = null!;
    public bool ContactConsent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class MatchAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public Guid VolunteerId { get; set; }
    public string Task { get; set; } = null!;
    public string Status { get; set; } = "Proposed";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
