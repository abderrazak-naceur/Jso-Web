using JSO.Domain;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace JSO.Infrastructure.Payments;

// Stripe hosted Checkout integration for international (non-Tunisia) buyers.
//
// Flow:
//   1. Create a Checkout Session with a single line item for the order total in
//      the configured currency (EUR by default). Stripe returns session.Url, a
//      HOSTED payment page; the fan pays there, so no card data reaches us.
//   2. Stripe calls our webhook. We verify the Stripe-Signature header with the
//      webhook signing secret using the official Stripe.net EventUtility, then
//      act only on checkout.session.completed. The order id travels in the
//      session metadata and the session id is stored as ProviderRef.
//
// The secret key and webhook secret come from configuration (environment
// variables in production) and are never logged.
public sealed class StripePaymentProvider(
    IOptions<PaymentOptions> options,
    ILogger<StripePaymentProvider> logger) : IPaymentProvider
{
    private readonly StripeOptions _stripe = options.Value.Stripe;

    // Legacy metadata key kept for backward compatibility with any Stripe
    // session created before the generic abstraction (still resolved by the
    // webhook as a ShopOrder). New sessions also carry the generic
    // PayableType/PayableId metadata below.
    public const string OrderIdMetadataKey = "orderId";
    // Generic payable metadata carried on every new Checkout session so the
    // webhook can route completion by type without guessing.
    public const string PayableTypeMetadataKey = "payableType";
    public const string PayableIdMetadataKey = "payableId";

    public string Name => "Stripe";

    public bool IsConfigured => _stripe.IsConfigured;

    public async Task<PaymentInitiation> InitiatePaymentAsync(PaymentRequest payable, string returnUrl, string cancelUrl, CancellationToken ct)
    {
        if (!IsConfigured)
            throw new PaymentProviderNotConfiguredException(Name);

        // Amounts are expressed in TND. Stripe does not universally settle in
        // TND, so we convert the TND amount to the configured Stripe currency
        // (EUR by default) using the CONFIGURABLE Payments:Stripe:TndToStripeRate.
        // The rate is a club responsibility (see docs/PAYMENTS.md); a
        // misconfigured non-positive rate is rejected rather than charging a
        // wrong amount.
        var chargedAmount = ComputeChargedAmount(payable.AmountTnd);
        var currency = _stripe.Currency.Trim().ToUpperInvariant();

        // Stripe amounts are in the smallest currency unit (cents for EUR).
        var amountMinor = (long)Math.Round(chargedAmount * 100m, MidpointRounding.AwayFromZero);
        if (amountMinor <= 0)
            throw new PaymentProviderException("Montant de paiement invalide après conversion de devise.");

        var metadata = new Dictionary<string, string>
        {
            [PayableTypeMetadataKey] = payable.PayableType,
            [PayableIdMetadataKey] = payable.PayableId.ToString()
        };
        // Preserve the legacy key for shop orders so any in-flight session and
        // existing tooling keep resolving.
        if (payable.PayableType == PayableTypes.ShopOrder)
            metadata[OrderIdMetadataKey] = payable.PayableId.ToString();

        var sessionOptions = new SessionCreateOptions
        {
            Mode = "payment",
            SuccessUrl = returnUrl,
            CancelUrl = cancelUrl,
            ClientReferenceId = payable.PayableId.ToString(),
            Metadata = metadata,
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = _stripe.Currency,
                        UnitAmount = amountMinor,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = payable.Description
                        }
                    }
                }
            ]
        };

        try
        {
            var service = new SessionService(new StripeClient(_stripe.SecretKey));
            var session = await service.CreateAsync(sessionOptions, cancellationToken: ct);
            if (string.IsNullOrWhiteSpace(session.Url) || string.IsNullOrWhiteSpace(session.Id))
                throw new PaymentProviderException("Réponse invalide du fournisseur de paiement.");
            return new PaymentInitiation(session.Url, session.Id, chargedAmount, currency);
        }
        catch (StripeException ex)
        {
            // Log the Stripe error code/message but never the secret key.
            logger.LogWarning("Stripe session creation failed for {PayableType} {PayableId}: {Code}", payable.PayableType, payable.PayableId, ex.StripeError?.Code);
            throw new PaymentProviderException("Le fournisseur de paiement a refusé la demande.");
        }
    }

    // Converts a TND order total into the configured Stripe settlement currency
    // using the configurable TND->Stripe rate. Rounded to 2 decimals.
    public decimal ComputeChargedAmount(decimal tndTotal)
    {
        if (_stripe.TndToStripeRate <= 0m)
            throw new PaymentProviderException("Taux de conversion de devise Stripe non configuré.");
        return Math.Round(tndTotal * _stripe.TndToStripeRate, 2, MidpointRounding.AwayFromZero);
    }

    // Expected Stripe amount for the order in the smallest currency unit, used by
    // the webhook to cross-check amount_total against what we intended to charge.
    public long ExpectedMinorUnits(decimal tndTotal) =>
        (long)Math.Round(ComputeChargedAmount(tndTotal) * 100m, MidpointRounding.AwayFromZero);

    // Configured Stripe settlement currency (upper-case, e.g. "EUR").
    public string ChargeCurrency => _stripe.Currency.Trim().ToUpperInvariant();

    // Verifies the Stripe-Signature header and returns the parsed event. Throws
    // on an invalid signature so the webhook endpoint can reject the call.
    public Event ConstructEvent(string payload, string signatureHeader)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(_stripe.WebhookSecret))
            throw new PaymentProviderNotConfiguredException(Name);

        return EventUtility.ConstructEvent(payload, signatureHeader, _stripe.WebhookSecret);
    }
}
