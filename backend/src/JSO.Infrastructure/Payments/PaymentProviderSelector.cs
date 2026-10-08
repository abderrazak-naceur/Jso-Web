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
            // Other checkout flows do not collect the e-mail and phone Paymee
            // requires. Donations can still request Paymee explicitly.
            return Konnect.IsConfigured ? Konnect : Flouci;

        return Stripe;
    }

    public IPaymentProvider? Select(string? country, string? requestedProvider)
    {
        var code = requestedProvider?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(code)) return Select(country);
        if (IsTunisia(country))
            return code switch
            {
                "FLOUCI" => Flouci,
                "KONNECT" => Konnect,
                "PAYMEE" => Paymee,
                _ => null,
            };
        return code == "STRIPE" ? Stripe : null;
    }
}
