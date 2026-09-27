namespace JSO.Domain;

// GDPR data export / portability request (idea E17). A fan exercises the right
// of access by asking for a copy of their personal data. Every request is
// recorded for audit and compliance, regardless of whether the export payload
// is returned immediately.
//
// In this iteration the export payload is produced synchronously and returned
// to the fan on the spot, so a fresh request is created already "Ready"; the
// Pending/Failed states exist so the same table can back an asynchronous
// generation flow later without a schema change. FileRef is a nullable opaque
// reference to a generated artefact (e.g. an object-storage key) for that
// future flow and stays null while exports are inline. No third party's data
// is ever stored here: FanUserId always comes from the authenticated claim.
public sealed class DataExportRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The fan who requested the export. Always taken from the authenticated
    // token, never from client input.
    public Guid FanUserId { get; set; }

    public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;

    // Lifecycle state: Pending / Ready / Failed. Inline exports are created
    // "Ready"; the other states support a future asynchronous generation flow.
    public string Status { get; set; } = "Pending";

    // Optional opaque reference to a generated export artefact (future async
    // flow). Null while exports are produced inline. Never contains PII.
    public string? FileRef { get; set; }

    // Set when the export reaches a terminal state (Ready or Failed).
    public DateTimeOffset? CompletedAt { get; set; }
}
