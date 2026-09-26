namespace JSO.Domain;

// Newsletter digest subscription (idea A4). Uses double opt-in: a subscription is only
// active once ConfirmedAt is set via the confirmation link. Opaque tokens are used for
// confirmation and unsubscribe so email links never expose the primary key or allow
// enumeration. No real email is sent in this iteration (transactional provider is a TODO).
public sealed class NewsletterSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = null!;
    // Optional link to a fan account when a logged-in fan subscribes; anonymous otherwise.
    public Guid? FanUserId { get; set; }
    // Set when the subscriber clicks the confirmation link (double opt-in). Null = pending.
    public DateTimeOffset? ConfirmedAt { get; set; }
    public bool Unsubscribed { get; set; }
    // Opaque tokens used by the email links so the Id is never exposed.
    public string ConfirmToken { get; set; } = Guid.NewGuid().ToString("N");
    public string UnsubscribeToken { get; set; } = Guid.NewGuid().ToString("N");
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ConfirmedOrUpdatedAt { get; set; }
}
