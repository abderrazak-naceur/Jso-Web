namespace JSO.Domain;

// A fan's ticket reservation for a match ticket type. Price/name are snapshotted
// at reservation time. Status flow: Pending -> Confirmed -> CheckedIn, with
// Pending -> Cancelled as the terminal reject path. Capacity (SoldCount on the
// TicketType) is incremented when payment is confirmed (webhook / manual
// gateway), mirroring the shop orders pattern. Once Confirmed the order carries
// an opaque QR token used at stadium check-in.
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

    // Digital ticket / QR check-in (additive, nullable). The QR is only a
    // representation of the ticket: the backend stays the source of truth. All
    // three fields stay null while the order is Pending/Cancelled.
    //
    // Opaque, high-entropy public token (32 random bytes, Base64URL) issued once
    // when the order transitions Pending -> Confirmed (idempotent: never
    // regenerated). It is NOT a credential and carries no PII/JWT: it is only a
    // lookup key the staff scanner presents so the server can resolve the ticket
    // and verify its state. A unique index guards against collisions.
    public string? PublicTicketToken { get; set; }
    // When the token was issued (i.e. when the order was confirmed).
    public DateTimeOffset? IssuedAt { get; set; }
    // Set atomically on the first successful staff check-in. A non-null value
    // means the ticket has already entered and must be rejected on re-scan.
    public DateTimeOffset? CheckedInAt { get; set; }
    // Admin/staff identity (sub claim) that performed the check-in, for audit.
    public string? CheckedInByAdminId { get; set; }
}
