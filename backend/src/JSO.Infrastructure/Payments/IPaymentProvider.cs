namespace JSO.Infrastructure.Payments;

// Unified abstraction over the real payment providers. Both implementations use
// the provider's HOSTED payment page, so card data never touches our servers.
// InitiatePaymentAsync creates a hosted payment session and returns the URL the
// browser must be redirected to plus the provider reference (session/payment
// id) we persist to reconcile the later webhook.
//
// The abstraction is GENERIC over the thing being paid: instead of a shop Order
// it takes a PaymentRequest describing the "payable" (its type + id + the amount
// in TND + a human description). This lets the exact same providers, currency
// conversion and amount cross-check power the shop, ticketing and the
// supporters' wall without duplicating any money-critical logic.
public interface IPaymentProvider
{
    // Stable provider name persisted on the payable ("Flouci" | "Stripe").
    string Name { get; }

    // True only when the required secrets are present. When false the caller
    // returns a clear, handled error instead of attempting a live call.
    bool IsConfigured { get; }

    // Creates a hosted payment session for the payable. returnUrl/cancelUrl are
    // the browser landing pages (which only show "en cours de vérification"),
    // never the source of truth for the paid state.
    Task<PaymentInitiation> InitiatePaymentAsync(PaymentRequest request, string returnUrl, string cancelUrl, CancellationToken ct);
}

// Describes a generic thing to be paid. PayableType is a stable discriminator
// ("ShopOrder" | "TicketOrder" | "SupporterBrick") that the webhook uses to
// route completion to the right handler; PayableId identifies the row; AmountTnd
// is the amount to charge expressed in TND (the app's base currency, converted
// for Stripe); Description is a short, non-sensitive label shown to the buyer.
public sealed record PaymentRequest(
    string PayableType,
    Guid PayableId,
    Guid? FanUserId,
    decimal AmountTnd,
    string Description);

// Well-known payable types. Kept as constants so providers, webhooks and the
// completion router all agree on the discriminator values.
public static class PayableTypes
{
    public const string ShopOrder = "ShopOrder";
    public const string TicketOrder = "TicketOrder";
    public const string SupporterBrick = "SupporterBrick";
}

// Result of starting a hosted payment. ChargedAmount/ChargedCurrency capture the
// exact amount and currency the buyer will be charged (for Flouci this is the
// TND amount; for Stripe the TND amount converted at the configured rate), so the
// payable record and the later webhook cross-check reflect what was really paid.
public sealed record PaymentInitiation(string RedirectUrl, string ProviderRef, decimal ChargedAmount, string ChargedCurrency);

// Outcome of verifying a payment with the provider (server-side, authoritative).
public enum PaymentVerificationStatus
{
    Pending,
    Succeeded,
    Failed
}

// Verification result. When available (e.g. Flouci verify_payment), Amount is the
// amount reported by the provider in its minor unit (millimes for TND) and
// Currency the reported currency, so the webhook can cross-check them against the
// payable before marking it paid. Amount is null when the provider does not return
// it on verification.
public sealed record PaymentVerification(
    PaymentVerificationStatus Status,
    string ProviderRef,
    long? Amount = null,
    string? Currency = null);
