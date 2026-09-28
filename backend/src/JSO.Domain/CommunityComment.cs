namespace JSO.Domain;

// Fan community comment with MANDATORY pre-publication moderation (idea 4.3 /
// BE-009). An authenticated fan (role "Fan") comments on a news article or a
// match; the comment starts in "Pending" and only surfaces publicly once a
// CommunityManager approves it. Rejected comments never become public.
//
// Security / privacy invariants:
//  - FanUserId is ALWAYS resolved from the authenticated token claim, never
//    from client input, so a fan can only ever author comments as themselves.
//  - The public read endpoint exposes NO PII (no email, no FanUserId): only a
//    freely chosen display name, the body, the target and the date.
//  - Body is stored as-is (plain text); clients MUST render it as text/escaped
//    to avoid stored XSS. The API never returns it inside HTML.
public sealed class CommunityComment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Author, resolved from the authenticated Fan token claim, never client input.
    public Guid FanUserId { get; set; }

    // Target kind: "News" or "Match" (validated in the controller).
    public string TargetType { get; set; } = null!;

    // Target identifier (Guid of the Article/Match), stored as text so a single
    // shape works across heterogeneous targets and is Flutter-friendly.
    public string TargetId { get; set; } = null!;

    // Free-text comment body (plain text, length-capped in the controller).
    public string Body { get; set; } = null!;

    // Moderation state: Pending / Approved / Rejected. Only Approved is public.
    public string Status { get; set; } = "Pending";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Audit of the moderation decision: which admin acted and when. Null while
    // the comment is still pending.
    public string? ModeratedByAdminId { get; set; }

    public DateTimeOffset? ModeratedAt { get; set; }
}
