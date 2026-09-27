namespace JSO.Domain;

// Fan shop order. Prices are recomputed server-side at creation and stored on
// the order/items so later product changes never alter historical orders.
// Status flow: Pending -> Paid -> Shipped -> Delivered (or Failed/Cancelled).
// The manual gateway lets an admin confirm payment; ProviderRef is reserved for
// a real payment provider's transaction id (webhook-driven) in a later phase.
public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FanUserId { get; set; }
    public string Status { get; set; } = "Pending";
    public string Currency { get; set; } = "TND";
    public decimal Total { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? Note { get; set; }
    public string? ProviderRef { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PaidAt { get; set; }
}
