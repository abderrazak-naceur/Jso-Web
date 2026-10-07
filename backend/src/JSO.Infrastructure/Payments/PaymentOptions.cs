namespace JSO.Infrastructure.Payments;

// Strongly-typed binding of the "Payments" configuration section. Every secret
// (Flouci app token/secret, Stripe secret key and webhook signing secret) is
// read from IConfiguration, which in production is fed exclusively by
// environment variables. The repository only ships empty placeholders; a real
// value is NEVER committed and is NEVER logged.
public sealed class PaymentOptions
{
    public const string SectionName = "Payments";

    public FlouciOptions Flouci { get; set; } = new();
    public StripeOptions Stripe { get; set; } = new();
}

public sealed class FlouciOptions
{
    // REST base URL of the Flouci developer API (hosted payment pages). No
    // trailing behaviour is assumed; a sensible public default is provided so a
    // deployment only needs to supply the credentials.
    public string BaseUrl { get; set; } = "https://developers.flouci.com/";

    // Public application token and secret issued by Flouci. Empty in the repo.
    public string AppToken { get; set; } = "";
    public string AppSecret { get; set; } = "";

    // Optional developer tracking id echoed back by Flouci. Not a secret.
    public string? DeveloperTrackingId { get; set; }

    // Hosted payment session lifetime, in seconds.
    public int SessionTimeoutSeconds { get; set; } = 1200;

    // Shared secret guarding the webhook endpoint. Required in Production;
    // optional for local development. Flouci does not send
    // a verifiable signature, so authenticity ultimately rests on the server-side
    // verify_payment call. When this is set, the webhook additionally requires a
    // matching "X-Flouci-Webhook-Secret" header (or query value) before doing any
    // work, reducing unauthenticated abuse/amplification. When empty the endpoint
    // keeps its current behaviour (protected by the verify call). Never logged.
    public string WebhookSecret { get; set; } = "";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AppToken) && !string.IsNullOrWhiteSpace(AppSecret);
}

public sealed class StripeOptions
{
    // Stripe secret key (sk_...) and webhook signing secret (whsec_...). Empty
    // in the repo; provided via environment variables in real environments.
    public string SecretKey { get; set; } = "";
    public string WebhookSecret { get; set; } = "";

    // Currency used for international Stripe payments. The shop prices are kept
    // in TND for Flouci; for Stripe we settle in a widely supported currency.
    // EUR is the documented default (see docs/PAYMENTS.md).
    public string Currency { get; set; } = "eur";

    // Conversion rate applied to convert the TND order total into the Stripe
    // settlement currency (Currency above). The charged amount is
    // order.Total (TND) * TndToStripeRate. This is a CONFIGURABLE club
    // responsibility: it MUST be reviewed and kept in sync with the real
    // TND->Currency exchange rate (see docs/PAYMENTS.md). The default below is an
    // explicit, documented placeholder (approx. TND->EUR) and is NOT a live rate
    // feed; there is deliberately no paid FX service dependency.
    public decimal TndToStripeRate { get; set; } = 0.30m;

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(WebhookSecret);
}
