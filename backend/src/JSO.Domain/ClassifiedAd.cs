namespace JSO.Domain;

// Community classifieds marketplace (idea B6): a moderated board where local
// businesses and fans publish small ads. It is both a light recurring revenue
// stream and a service to the community.
//
// Moderation is MANDATORY before publication: an ad starts in "Pending" and
// only surfaces on the public board once a CommunityManager/ClubAdmin sets it
// to "Approved". Rejected ads never become public. Expired ads (ExpiresAt in
// the past) also drop off the public board.
//
// Privacy: contact details are optional and only surfaced publicly when the
// author explicitly consents (ShowContact). No PII beyond the freely provided
// Title/Body/ContactInfo is exposed.
//
// Payments: publication fees are intentionally OUT OF SCOPE for this iteration
// (they depend on a TND payment gateway, see TODO / BUSINESS_PLAN). Price is a
// declared value of the item being sold, NOT a fee we collect; no real payment
// is processed here.
public sealed class ClassifiedAd
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Optional link to a known fan identity (FanUser). Null for admin-created
    // ads or when the author is not a registered fan.
    public Guid? AuthorFanUserId { get; set; }

    // Required public title of the ad.
    public string Title { get; set; } = null!;

    // Free-text body of the ad.
    public string Body { get; set; } = null!;

    // Free-text category label (e.g. "Emploi", "Vente", "Service").
    public string Category { get; set; } = null!;

    // Moderation state: Pending / Approved / Rejected. Only Approved is public.
    public string Status { get; set; } = "Pending";

    // Declared price of the item being sold, stored as numeric(14,2) (see
    // JsoDbContext). Nullable: many ads (services, "cherche") have no price.
    // TODO payments: this is NOT a collected publication fee. Paid publication
    // fees depend on a certified TND payment gateway and are out of scope.
    public decimal? Price { get; set; }

    // Optional contact details (phone/email). Only surfaced publicly when the
    // author has consented via ShowContact.
    public string? ContactInfo { get; set; }

    // Consent flag: the public API only returns ContactInfo when this is true.
    public bool ShowContact { get; set; }

    // Optional expiry. When set and in the past, the ad drops off the public
    // board even if Approved.
    public DateTimeOffset? ExpiresAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
