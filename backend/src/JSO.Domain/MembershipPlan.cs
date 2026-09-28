namespace JSO.Domain;

// A supporter membership/subscription plan (idea B: monetisation). A plan is a
// named, priced, time-boxed offer (DurationDays) a fan can subscribe to. Plans
// are configured by admins and only active plans are offered to the public.
//
// Price is snapshotted onto the Membership at subscription time, so changing a
// plan's price never alters an already-purchased membership. Currency is the
// app base currency (TND); international buyers are charged the converted amount
// by Stripe exactly like every other payable.
public sealed class MembershipPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Public plan name (e.g. "Abonnement annuel").
    public string Name { get; set; } = null!;

    // Optional public description of what the plan includes.
    public string? Description { get; set; }

    // Plan price, stored as numeric(14,2) (see JsoDbContext). Base currency TND.
    public decimal Price { get; set; }

    // Base currency of the price. Always "TND" for now (mirrors the shop/tickets).
    public string Currency { get; set; } = "TND";

    // Membership duration in days from activation (StartsAt) to EndsAt.
    public int DurationDays { get; set; }

    // Only active plans are offered publicly; deactivating a plan keeps existing
    // memberships intact but hides it from the public catalogue.
    public bool IsActive { get; set; } = true;

    // Ordering hint for the public catalogue (ascending).
    public int DisplayOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
