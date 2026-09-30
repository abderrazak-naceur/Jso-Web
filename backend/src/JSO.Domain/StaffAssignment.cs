namespace JSO.Domain;

public sealed class StaffAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AdminUserId { get; set; }
    public string Role { get; set; } = "TicketSeller";
    public string ScopeType { get; set; } = "Global";
    public string? ScopeId { get; set; }
    public string? GateId { get; set; }
    public string? DeviceId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset? ValidFrom { get; set; }
    public DateTimeOffset? ValidTo { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
