namespace JSO.Domain;

/// <summary>A match-scoped full-discount code used to grant and test a ticket.</summary>
public sealed class TicketPromoCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int Uses { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
