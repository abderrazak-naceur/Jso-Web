namespace JSO.Domain;

// GDPR account deletion / right-to-erasure request (idea E17). A fan asks for
// their account to be removed. Rather than hard-deleting the row (which would
// break referential history and audit), the account is anonymised and
// deactivated: the email is replaced with a non-reversible placeholder, the
// password hash is cleared, IsActive is set to false and the display name is
// neutralised. The request itself is recorded for audit and compliance.
//
// The flow is idempotent: a second request for an already-anonymised account
// simply confirms the existing "Completed" state without re-running the
// anonymisation. FanUserId always comes from the authenticated claim, never
// from client input.
public sealed class AccountDeletionRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // The fan who requested deletion. Always taken from the authenticated
    // token, never from client input.
    public Guid FanUserId { get; set; }

    public DateTimeOffset RequestedAt { get; set; } = DateTimeOffset.UtcNow;

    // Lifecycle state: Pending / Completed. The anonymisation runs inline so a
    // request is normally created already "Completed"; Pending remains for a
    // possible future deferred/approval flow without a schema change.
    public string Status { get; set; } = "Pending";

    // Set when the anonymisation has been applied.
    public DateTimeOffset? CompletedAt { get; set; }
}
