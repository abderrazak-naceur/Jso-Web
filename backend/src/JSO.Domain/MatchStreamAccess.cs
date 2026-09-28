namespace JSO.Domain;

// A fan's paid access to a match live stream (idea B24). Created "Pending" when
// the fan starts a payment and only moves to "Paid" once the payment is
// confirmed SERVER-SIDE by the verified provider webhook. A fan can hold at most
// one access per stream (unique FanUserId + MatchStreamId): repeated /access
// calls reuse the existing Pending/Paid row rather than creating duplicates.
//
// Entitlement to reveal the MatchStream.StreamUrl is derived from Status == Paid
// for the current fan, verified server-side from the JWT claim. The access row
// carries no card data; only payment routing/reconciliation fields (mirroring
// the other payables).
public sealed class MatchStreamAccess
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The viewing fan (FanUser).
    public Guid FanUserId { get; set; }

    // The stream being purchased.
    public Guid MatchStreamId { get; set; }

    // Access state: Pending (awaiting payment) -> Paid (confirmed server-side).
    public string Status { get; set; } = "Pending";

    // Online payment routing/reconciliation (additive, nullable), mirroring the
    // other payables. Provider's session/payment id used to reconcile the
    // webhook; the routed provider ("Flouci"/"Stripe"); the ISO country chosen
    // at checkout; and the amount/currency actually charged.
    public string? ProviderRef { get; set; }
    public string? PaymentProvider { get; set; }
    public string? Country { get; set; }
    public decimal? ChargedAmount { get; set; }
    public string? ChargedCurrency { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Payment timestamp: set server-side by the verified webhook. Null until paid.
    public DateTimeOffset? PaidAt { get; set; }
}
