namespace JSO.Domain;

// Fan-submitted report/flag on a piece of community content (idea 4.3 /
// BE-009). Lets fans flag an abusive comment (or other target) for review by a
// CommunityManager. Reports start "Open" and are triaged from the admin
// moderation queue.
//
// Security / privacy invariants:
//  - ReporterFanUserId is ALWAYS resolved from the authenticated Fan token
//    claim, never from client input.
//  - There is no public read endpoint for reports; they are visible only to
//    moderators. No reporter PII is ever surfaced publicly.
public sealed class CommunityReport
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Reporter, resolved from the authenticated Fan token claim, never client input.
    public Guid ReporterFanUserId { get; set; }

    // Reported target kind: "Comment" (extensible to other targets later).
    public string TargetType { get; set; } = null!;

    // Reported target identifier, stored as text.
    public string TargetId { get; set; } = null!;

    // Optional free-text reason (plain text, length-capped in the controller).
    public string? Reason { get; set; }

    // Triage state: Open / Resolved / Dismissed. Defaults to "Open".
    public string Status { get; set; } = "Open";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    // Audit of the triage decision: which admin handled it. Null while Open.
    public string? HandledByAdminId { get; set; }

    public DateTimeOffset? HandledAt { get; set; }
}
