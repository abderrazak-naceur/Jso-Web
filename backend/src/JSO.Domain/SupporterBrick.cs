namespace JSO.Domain;

// Digital supporters' wall (idea B7): fans "buy" a virtual brick carrying a
// display name and an optional dedication that appears on a permanent public
// page, used as an emotional fundraising lever beyond time-boxed campaigns.
//
// Moderation is mandatory: a brick starts in "Pending" and only surfaces on the
// public wall once a CommunityManager/ClubAdmin sets it to "Approved". The wall
// exposes no PII beyond the freely chosen DisplayName and Message.
//
// Payments: a fan can pay their own brick online via the shared Flouci/Stripe
// abstraction (routed by country). We never handle card data on our servers;
// confirmation is exclusively server-side via the verified provider webhook,
// which sets PaymentStatus="Paid" + PaidAt. Payment is ORTHOGONAL to moderation
// (Status): paying never approves a brick and approving never marks it paid.
public sealed class SupporterBrick
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Optional link to a known fan identity (FanUser). Null for anonymous or
    // admin-created bricks.
    public Guid? FanUserId { get; set; }

    // Required public label chosen by the supporter.
    public string DisplayName { get; set; } = null!;

    // Optional public dedication / message.
    public string? Message { get; set; }

    // Declared contribution amount, stored as numeric(14,2) (see JsoDbContext).
    public decimal Amount { get; set; }

    // Moderation state: Pending / Approved / Rejected. Only Approved is public.
    // IMPORTANT: this field is the MODERATION state only. Payment is tracked
    // separately (see PaymentStatus/PaidAt) so the two concerns stay orthogonal:
    // a brick becomes public only when a CommunityManager sets Status=Approved,
    // regardless of whether it has been paid, and paying never changes the
    // moderation decision.
    public string Status { get; set; } = "Pending";

    // Payment state, INDEPENDENT of moderation (Status above). "Pending" until a
    // certified provider confirms the contribution server-side, then "Paid".
    // Kept separate from Status so a real online payment never bypasses or
    // alters moderation. Public wall visibility remains driven by Status only.
    public string PaymentStatus { get; set; } = "Pending";

    // Payment timestamp: set server-side by the verified provider webhook when
    // the contribution is confirmed. Null until paid.
    public DateTimeOffset? PaidAt { get; set; }

    // Online payment routing/reconciliation (additive, nullable), mirroring the
    // shop Order fields. Provider's session/payment id used to reconcile the
    // webhook with the brick; the routed provider ("Flouci"/"Stripe"); the ISO
    // country chosen at checkout; and the amount/currency actually charged.
    public string? ProviderRef { get; set; }
    public string? PaymentProvider { get; set; }
    public string? Country { get; set; }
    public decimal? ChargedAmount { get; set; }
    public string? ChargedCurrency { get; set; }

    // Cash-collection metadata. Kept off the public receipt response except for the point name/type.
    public string? CashPointType { get; set; }
    public string? CashPointName { get; set; }
    public string? CashDonorPhone { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
