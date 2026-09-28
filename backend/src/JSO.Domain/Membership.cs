namespace JSO.Domain;

// A fan's subscription to a MembershipPlan (idea B: monetisation). A membership
// is created in "Pending" and only becomes "Active" once the payment is
// confirmed SERVER-SIDE by the verified provider webhook (never by the browser
// redirect). On activation StartsAt = now and EndsAt = now + plan DurationDays.
//
// Price/Currency are snapshotted from the plan at subscription time so a later
// plan price change never mutates an already-purchased membership. The payment
// routing/reconciliation fields mirror every other payable (shop order, ticket
// order, supporter brick) so the shared Flouci/Stripe abstraction drives it with
// no money-critical logic duplicated.
public sealed class Membership
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The subscribing fan (FanUser). Required: memberships are always personal.
    public Guid FanUserId { get; set; }

    // The chosen plan. Kept as a reference for admin listing/reporting; the
    // price is snapshotted below so reporting never depends on the plan's
    // current price.
    public Guid MembershipPlanId { get; set; }

    // Lifecycle: Pending (awaiting payment) -> Active (paid, within its window)
    // -> Expired (past EndsAt) / Cancelled (admin/fan cancelled). Only the
    // verified webhook moves Pending -> Active.
    public string Status { get; set; } = "Pending";

    // Activation window. Null until the payment is confirmed; set server-side by
    // the webhook (StartsAt = now, EndsAt = now + plan DurationDays).
    public DateTimeOffset? StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }

    // Snapshotted price/currency from the plan at subscription time. The webhook
    // cross-checks the provider-settled amount against this snapshot.
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TND";

    // Payment state, INDEPENDENT of the lifecycle Status above. "Pending" until a
    // certified provider confirms the payment server-side, then "Paid".
    public string PaymentStatus { get; set; } = "Pending";

    // Online payment routing/reconciliation (additive, nullable), mirroring the
    // shop Order / TicketOrder / SupporterBrick fields. Provider's session/
    // payment id used to reconcile the webhook; the routed provider
    // ("Flouci"/"Stripe"); the ISO country chosen at checkout; and the
    // amount/currency actually charged.
    public string? ProviderRef { get; set; }
    public string? PaymentProvider { get; set; }
    public string? Country { get; set; }
    public decimal? ChargedAmount { get; set; }
    public string? ChargedCurrency { get; set; }

    // Payment timestamp: set server-side by the verified webhook. Null until paid.
    public DateTimeOffset? PaidAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
