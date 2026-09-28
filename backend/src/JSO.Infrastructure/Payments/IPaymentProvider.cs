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

// Result of starting a hosted payment.
public sealed record PaymentInitiation(string RedirectUrl, string ProviderRef);

// Outcome of verifying a payment with the provider (server-side, authoritative).
public enum PaymentVerificationStatus
{
    Pending,
    Succeeded,
    Failed
}

public sealed record PaymentVerification(PaymentVerificationStatus Status, string ProviderRef);
