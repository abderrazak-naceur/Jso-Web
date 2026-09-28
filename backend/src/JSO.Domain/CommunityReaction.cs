namespace JSO.Domain;

// Fan reaction on a content target (idea 4.3 / BE-009). A lightweight "like"
// style signal that, unlike comments, needs no moderation because it carries no
// free text and exposes no PII (public endpoints only ever return aggregate
// counts, never who reacted).
//
// Uniqueness choice (documented): the unique index is on
// (FanUserId, TargetType, TargetId, Kind). This lets a fan express several
// DIFFERENT reaction kinds on the same target (e.g. Like AND Clap) while
// preventing duplicates of the SAME kind. Toggling a reaction off simply
// deletes the row. This is the most common product behaviour and keeps the
// "put / remove" endpoints idempotent.
public sealed class CommunityReaction
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Owner, resolved from the authenticated Fan token claim, never client input.
    public Guid FanUserId { get; set; }

    // Target kind: "News" or "Match" (validated in the controller).
    public string TargetType { get; set; } = null!;

    // Target identifier (Guid of the Article/Match), stored as text.
    public string TargetId { get; set; } = null!;

    // Reaction kind, e.g. Like / Love / Clap (validated in the controller).
    public string Kind { get; set; } = null!;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
