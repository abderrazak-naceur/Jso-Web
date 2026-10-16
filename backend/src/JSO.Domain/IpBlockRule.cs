namespace JSO.Domain;

public sealed class IpBlockRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string NetworkCidr { get; set; } = "";
    public string Reason { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ExpiresAt { get; set; }
    public Guid CreatedByAdminId { get; set; }
}
