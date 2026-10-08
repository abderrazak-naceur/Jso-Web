namespace JSO.Infrastructure.Payments;

public sealed class PaymentProviderSelector(
    FlouciPaymentProvider flouci,
    StripePaymentProvider stripe,
    KonnectPaymentProvider konnect,
    PaymeePaymentProvider paymee)
{
    public FlouciPaymentProvider Flouci { get; } = flouci;
    public StripePaymentProvider Stripe { get; } = stripe;
    public KonnectPaymentProvider Konnect { get; } = konnect;
    public PaymeePaymentProvider Paymee { get; } = paymee;

    public static bool IsTunisia(string? country)
    {
        var c = country?.Trim().ToUpperInvariant();
        return c is "TN" or "TUN" or "TUNISIA" or "TUNISIE";
    }

    public IPaymentProvider Select(string? country)
    {
        if (IsTunisia(country))
            return Konnect.IsConfigured ? Konnect : Flouci.IsConfigured ? Flouci : Paymee;

        return Stripe;
    }
}
