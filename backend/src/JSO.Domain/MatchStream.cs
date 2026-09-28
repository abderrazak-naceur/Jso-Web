namespace JSO.Domain;

// Pay-per-view live streaming access for a single match (idea B24). SCOPE: this
// models the paid ACCESS mechanism only, NOT the broadcasting rights or the
// actual stream production (both remain the club's responsibility, see
// docs/PAYMENTS.md). The StreamUrl/PlaybackRef (e.g. a YouTube unlisted link or
// an embed) is only ever revealed server-side to a viewer who is entitled:
// either the stream is free (IsPaid == false) or the fan has a Paid
// MatchStreamAccess. It is NEVER returned to an unpaid viewer.
//
// This is a link-gating mechanism, not DRM: a paying viewer could technically
// reshare the link. That honest limitation is documented; hardening (signed
// tokens, DRM) is out of scope for this iteration.
public sealed class MatchStream
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The match this stream belongs to. One stream per match.
    public Guid MatchId { get; set; }

    // Streaming provider hint (e.g. "YouTube", "Other"). Purely informational.
    public string Provider { get; set; } = "YouTube";

    // The sensitive playback link / embed reference. REVEALED ONLY to entitled
    // viewers (free stream or a Paid access). Never surfaced to the public.
    public string? StreamUrl { get; set; }

    // When true the stream requires a paid MatchStreamAccess; when false the
    // StreamUrl is revealed to any viewer of the published stream.
    public bool IsPaid { get; set; } = true;

    // Access price, stored as numeric(14,2) (see JsoDbContext). Base currency TND.
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TND";

    // Optional broadcast window shown to viewers (informational).
    public DateTimeOffset? StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }

    // Only a published stream is visible to the public; drafts stay admin-only.
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
