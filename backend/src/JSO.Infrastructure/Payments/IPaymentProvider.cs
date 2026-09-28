using JSO.Domain;

namespace JSO.Infrastructure.Payments;

// Unified abstraction over the real payment providers. Both implementations use
// the provider's HOSTED payment page, so card data never touches our servers.
// InitiatePaymentAsync creates a hosted payment session and returns the URL the
// browser must be redirected to plus the provider reference (session/payment
// id) we persist to reconcile the later webhook.
public interface IPaymentProvider
{
    // Stable provider name persisted on the order ("Flouci" | "Stripe").
    string Name { get; }

    // True only when the required secrets are present. When false the caller
    // returns a clear, handled error instead of attempting a live call.
    bool IsConfigured { get; }

    // Creates a hosted payment session for the order. returnUrl/cancelUrl are
    // the browser landing pages (which only show "en cours de vérification"),
    // never the source of truth for the paid state.
    Task<PaymentInitiation> InitiatePaymentAsync(Order order, string returnUrl, string cancelUrl, CancellationToken ct);
}

// Result of starting a hosted payment. ChargedAmount/ChargedCurrency capture the
// exact amount and currency the buyer will be charged (for Flouci this is the
// TND total; for Stripe the TND total converted at the configured rate), so the
// order record and the later webhook cross-check reflect what was really paid.
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
// order before marking it paid. Amount is null when the provider does not return
// it on verification.
public sealed record PaymentVerification(
    PaymentVerificationStatus Status,
    string ProviderRef,
    long? Amount = null,
    string? Currency = null);
