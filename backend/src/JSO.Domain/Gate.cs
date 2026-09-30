namespace JSO.Domain;

public sealed class Gate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? FacilityId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class ScannerDevice
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? GateId { get; set; }
    public string DeviceCode { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}