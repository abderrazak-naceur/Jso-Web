namespace JSO.Domain;

// Central, single-source-of-truth logic for a membership's EFFECTIVE lifecycle
// status. A membership is only ever moved to "Active" by the verified payment
// webhook (see MembershipCompletion), which also stamps EndsAt = now + plan
// DurationDays. Nothing, however, moves an Active membership back to "Expired"
// once EndsAt passes: there is no scheduled job by design.
//
// To avoid over-granting an entitlement, every READ path that exposes or relies
// on the membership status must derive the effective status here instead of
// trusting the stored Status column. The rule is intentionally tiny: an
// "Active" membership whose EndsAt is in the past is effectively "Expired".
// All other states (Pending, Cancelled, an already-persisted Expired) are
// returned unchanged.
//
// This is a pure, read-time derivation: it never mutates the entity and never
// requires a schema change. The stored Status stays whatever the webhook wrote;
// consumers simply reinterpret an elapsed Active as Expired.
public static class MembershipStatus
{
    public const string Active = "Active";
    public const string Expired = "Expired";

    // True only when the membership is Active AND its window has not elapsed.
    // Callers pass the reference instant (usually DateTimeOffset.UtcNow) so the
    // decision is deterministic and testable.
    public static bool IsCurrentlyActive(string status, DateTimeOffset? endsAt, DateTimeOffset now)
        => status == Active && (endsAt is null || endsAt.Value > now);

    // Derives the effective status for display/entitlement. An Active membership
    // past its EndsAt is reported as Expired; every other status is unchanged.
    public static string Effective(string status, DateTimeOffset? endsAt, DateTimeOffset now)
        => status == Active && endsAt is not null && endsAt.Value <= now ? Expired : status;
}
