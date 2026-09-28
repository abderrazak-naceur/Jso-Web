namespace JSO.Infrastructure.Payments;

// Thrown when a payment cannot be started for a reason we want to surface to
// the fan as a clean, handled error (never a stack trace, never a secret).
public class PaymentProviderException(string message) : Exception(message);

// Specialised case: the provider's secrets are not configured (e.g. in the
// sandbox). The API translates this into a clear "paiement indisponible"
// response so the checkout degrades gracefully instead of crashing.
public sealed class PaymentProviderNotConfiguredException(string provider)
    : PaymentProviderException($"Le paiement en ligne via {provider} n'est pas encore configuré.")
{
    public string Provider { get; } = provider;
}
