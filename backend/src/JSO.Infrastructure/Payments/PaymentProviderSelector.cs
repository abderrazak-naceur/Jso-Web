namespace JSO.Infrastructure.Payments;

// Routes a checkout to the correct provider based on the buyer's country.
// Tunisia -> Flouci (TND). Everything else -> Stripe (international).
public sealed class PaymentProviderSelector(
    FlouciPaymentProvider flouci,
    StripePaymentProvider stripe)
{
    public FlouciPaymentProvider Flouci { get; } = flouci;
    public StripePaymentProvider Stripe { get; } = stripe;

    // Returns true when the (normalised) country is Tunisia. Accepts the ISO
    // alpha-2 code "TN" as well as common French/English names.
    public static bool IsTunisia(string? country)
    {
        var c = country?.Trim().ToUpperInvariant();
        return c is "TN" or "TUN" or "TUNISIA" or "TUNISIE";
    }

    public IPaymentProvider Select(string? country) =>
        IsTunisia(country) ? Flouci : (IPaymentProvider)Stripe;
}
