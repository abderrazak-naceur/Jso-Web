namespace JSO.Domain;

// Feature flag and lightweight A/B testing (idea E18): toggle features or
// content variants on/off without a release, and optionally roll them out to a
// percentage of traffic.
//
// The public API exposes ONLY the enabled flags (key, enabled, variant,
// rolloutPercent) so web/Flutter clients can gate rendering with a safe
// fallback. All management (create/update/delete/toggle) is restricted to the
// SuperAdmin / ClubAdmin roles and every write is audited.
//
// Privacy: this mechanism performs NO personal profiling. RolloutPercent is a
// stateless traffic bucket the client evaluates locally; we store no per-user
// assignment and no personal data here.
public sealed class FeatureFlag
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Unique, stable identifier the clients look up (e.g. "new-home-hero").
    public string Key { get; set; } = null!;

    // Master switch. Disabled flags are never surfaced on the public endpoint.
    public bool Enabled { get; set; }

    // Optional A/B variant label (e.g. "A" / "B" / "control").
    public string? Variant { get; set; }

    // Optional rollout bucket 0..100 (percent of traffic). Null means "no
    // gradual rollout" (full exposure when Enabled).
    public int? RolloutPercent { get; set; }

    // Optional internal note describing what the flag controls.
    public string? Description { get; set; }

    // Last time the flag was created or modified.
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
