namespace JSO.Infrastructure.Payments;

public interface IPaymentProvider
{
    string Name { get; }
    bool IsConfigured { get; }
    Task<PaymentInitiation> InitiatePaymentAsync(PaymentRequest request, string returnUrl, string cancelUrl, CancellationToken ct);
}

public sealed record PaymentRequest(
    string PayableType,
    Guid PayableId,
    Guid? FanUserId,
    decimal AmountTnd,
    string Description);

public static class PayableTypes
{
    public const string ShopOrder = "ShopOrder";
    public const string TicketOrder = "TicketOrder";
    public const string SupporterBrick = "SupporterBrick";
    public const string Membership = "Membership";
    public const string MatchStreamAccess = "MatchStreamAccess";
    public const string Donation = "Donation";
}

public sealed record PaymentInitiation(
    string RedirectUrl,
    string ProviderRef,
    decimal ChargedAmount,
    string ChargedCurrency);

public enum PaymentVerificationStatus
{
    Pending,
    Succeeded,
    Failed
}

public sealed record PaymentVerification(
    PaymentVerificationStatus Status,
    string ProviderRef,
    long? Amount = null,
    string? Currency = null, string? PayableReference = null);