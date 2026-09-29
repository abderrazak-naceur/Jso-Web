namespace JSO.Domain;

// Immutable audit record of a staff scan at the stadium entrance. One row is
// written per meaningful attempt (successful check-in AND rejected re-scans /
// invalid scans), giving a full, queryable entry history separate from the
// generic AuditLog. Never stores the full QR token, only the resolved ticket
// reference and the outcome, so the log cannot be used to replay a ticket.
public sealed class TicketCheckIn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    // The resolved ticket order, when the scan matched a known ticket. Null when
    // the scanned token did not resolve to any ticket (Invalid).
    public Guid? TicketOrderId { get; set; }
    public Guid? MatchId { get; set; }
    // Staff/operator identity (sub claim) that performed the scan.
    public string? CheckedInByAdminId { get; set; }
    public DateTimeOffset CheckedInAt { get; set; } = DateTimeOffset.UtcNow;
    // Optional check-in station / device identifier supplied by the scanner.
    public string? DeviceId { get; set; }
    // Outcome of the scan: Valid / AlreadyUsed / Invalid / Cancelled / WrongMatch.
    public string Result { get; set; } = null!;
}
