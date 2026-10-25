namespace JSO.Domain;

public sealed class SecurityTrafficEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string Category { get; set; } = "suspicious";
    public string Severity { get; set; } = "low";
    public string Signal { get; set; } = "";
    public string Path { get; set; } = "/";
    public string? ClientAddress { get; set; }
    public string? UserAgentFamily { get; set; }
    public bool VerifiedBot { get; set; }
}
