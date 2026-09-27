namespace JSO.Domain;

// A fan's ticket reservation for a match ticket type. Price/name are snapshotted
// at reservation time. Status flow: Pending -> Confirmed -> Cancelled. Capacity
// (SoldCount on the TicketType) is incremented when the admin confirms payment
// (manual gateway), mirroring the shop orders pattern.
public sealed class TicketOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FanUserId { get; set; }
    public Guid MatchId { get; set; }
    public Guid TicketTypeId { get; set; }
    public string TicketTypeName { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public string Currency { get; set; } = "TND";
    public int Quantity { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ConfirmedAt { get; set; }
}
