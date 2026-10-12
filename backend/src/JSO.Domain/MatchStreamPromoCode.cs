namespace JSO.Domain;

/// <summary>Promo rules for a specific pay-per-view stream. Usage count is updated transactionally when redeemed.</summary>
public sealed class MatchStreamPromoCode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchStreamId { get; set; }
    public string Code { get; set; } = string.Empty;
    public int DiscountPercent { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int Uses { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}