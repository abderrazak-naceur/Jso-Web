namespace JSO.Domain;

// Digital supporters' wall (idea B7): fans "buy" a virtual brick carrying a
// display name and an optional dedication that appears on a permanent public
// page, used as an emotional fundraising lever beyond time-boxed campaigns.
//
// Moderation is mandatory: a brick starts in "Pending" and only surfaces on the
// public wall once a CommunityManager/ClubAdmin sets it to "Approved". The wall
// exposes no PII beyond the freely chosen DisplayName and Message.
//
// Payments: real payment processing is intentionally OUT OF SCOPE for this
// iteration (we never handle card data on our servers). Amount is a declared
// figure and PaidAt is optional/simulated; confirmation through a certified
// payment provider is a documented TODO.
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
    public string Status { get; set; } = "Pending";

    // Optional/simulated payment timestamp. Real confirmation is a TODO pending
    // a certified payment provider integration.
    public DateTimeOffset? PaidAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
