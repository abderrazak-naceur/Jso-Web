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

    // Online payment routing/reconciliation (additive, nullable). Mirrors the
    // shop Order fields so the shared, generic payment abstraction can drive a
    // real Flouci/Stripe payment for a ticket reservation. Confirmation is
    // exclusively server-side via the verified provider webhook: on success the
    // order moves Pending -> Confirmed and the TicketType SoldCount is
    // incremented (capacity), mirroring the admin manual gateway.
    //
    // Provider's session/payment id used to reconcile the webhook with the
    // reservation. Null until the fan starts an online payment.
    public string? ProviderRef { get; set; }
    // Real payment provider routed at checkout by the buyer's country:
    // "Flouci" (Tunisia, TND) or "Stripe" (international). Null until payment.
    public string? PaymentProvider { get; set; }
    // ISO country the fan selected at checkout (e.g. "TN", "FR").
    public string? Country { get; set; }
    // Amount/currency actually charged by the provider (for Flouci this equals
    // Total in TND; for Stripe the TND total converted at the configured rate).
    public decimal? ChargedAmount { get; set; }
    public string? ChargedCurrency { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
}
