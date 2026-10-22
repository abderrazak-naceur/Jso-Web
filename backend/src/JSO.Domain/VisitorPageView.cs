namespace JSO.Domain;

public sealed class VisitorPageView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string Path { get; set; } = "/";
    public string ReferrerHost { get; set; } = "";
    public string DeviceClass { get; set; } = "unknown";
    public string VisitorKey { get; set; } = "";
}
