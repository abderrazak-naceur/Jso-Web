using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using JSO.Domain;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JSO.Infrastructure.Payments;

// Flouci (https://docs.flouci.com) hosted payment integration for Tunisia (TND).
//
// Flow:
//   1. "generate payment" (POST api/generate_payment) with the app token/secret
//      and the amount in millimes -> Flouci returns a HOSTED payment link (and a
//      payment id). The fan is redirected there and pays on Flouci's page, so no
//      card data ever reaches our servers.
//   2. On completion Flouci calls our webhook. We NEVER trust the webhook body:
//      we take the payment id and call "verify payment"
//      (GET api/verify_payment/{id}) with our secret to authoritatively confirm
//      the "SUCCESS" state before marking the order paid.
//
// The app token/secret are read from configuration (environment variables in
// production) and are never logged.
public sealed class FlouciPaymentProvider(
    HttpClient httpClient,
    IOptions<PaymentOptions> options,
    ILogger<FlouciPaymentProvider> logger) : IPaymentProvider
{
    private readonly FlouciOptions _flouci = options.Value.Flouci;

    public string Name => "Flouci";

    public bool IsConfigured => _flouci.IsConfigured;

    public async Task<PaymentInitiation> InitiatePaymentAsync(Order order, string returnUrl, string cancelUrl, CancellationToken ct)
    {
        if (!IsConfigured)
            throw new PaymentProviderNotConfiguredException(Name);

        // Flouci amounts are expressed in millimes (1 TND = 1000 millimes).
        var amountMillimes = (long)Math.Round(order.Total * 1000m, MidpointRounding.AwayFromZero);
        var chargedAmount = Math.Round(order.Total, 2, MidpointRounding.AwayFromZero);

        var request = new GeneratePaymentRequest
        {
            AppToken = _flouci.AppToken,
            AppSecret = _flouci.AppSecret,
            Amount = amountMillimes.ToString(CultureInfo.InvariantCulture),
            AcceptCard = true,
            SessionTimeoutSecs = _flouci.SessionTimeoutSeconds,
            SuccessLink = returnUrl,
            FailLink = cancelUrl,
            DeveloperTrackingId = _flouci.DeveloperTrackingId ?? order.Id.ToString()
        };

        using var response = await httpClient.PostAsJsonAsync("api/generate_payment", request, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Flouci generate_payment failed with status {Status} for order {OrderId}", (int)response.StatusCode, order.Id);
            throw new PaymentProviderException("Le fournisseur de paiement a refusé la demande.");
        }

        var payload = await response.Content.ReadFromJsonAsync<GeneratePaymentResponse>(cancellationToken: ct);
        var link = payload?.Result?.Link;
        var paymentId = payload?.Result?.PaymentId;
        if (string.IsNullOrWhiteSpace(link) || string.IsNullOrWhiteSpace(paymentId))
        {
            logger.LogWarning("Flouci generate_payment returned an incomplete payload for order {OrderId}", order.Id);
            throw new PaymentProviderException("Réponse invalide du fournisseur de paiement.");
        }

        // Flouci settles in TND: the charged amount equals the order total in TND.
        return new PaymentInitiation(link, paymentId, chargedAmount, "TND");
    }

    // Authoritative server-side verification: called from the webhook with the
    // payment id extracted from the notification. Confirms success with Flouci
    // using our secret before the order is marked paid.
    public async Task<PaymentVerification> VerifyPaymentAsync(string paymentId, CancellationToken ct)
    {
        if (!IsConfigured)
            throw new PaymentProviderNotConfiguredException(Name);
        if (string.IsNullOrWhiteSpace(paymentId))
            return new PaymentVerification(PaymentVerificationStatus.Failed, paymentId);

        using var message = new HttpRequestMessage(HttpMethod.Get, $"api/verify_payment/{Uri.EscapeDataString(paymentId)}");
        // Flouci verify uses the app credentials as headers.
        message.Headers.Add("apppublic", _flouci.AppToken);
        message.Headers.Add("appsecret", _flouci.AppSecret);

        using var response = await httpClient.SendAsync(message, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Flouci verify_payment failed with status {Status}", (int)response.StatusCode);
            return new PaymentVerification(PaymentVerificationStatus.Pending, paymentId);
        }

        var payload = await response.Content.ReadFromJsonAsync<VerifyPaymentResponse>(cancellationToken: ct);
        var status = payload?.Result?.Status?.Trim().ToUpperInvariant();
        // Flouci reports the paid amount in millimes and the currency; expose them
        // so the webhook can cross-check the amount against the order total.
        var amount = payload?.Result?.Amount;
        var currency = payload?.Result?.Currency?.Trim().ToUpperInvariant();
        return status switch
        {
            "SUCCESS" => new PaymentVerification(PaymentVerificationStatus.Succeeded, paymentId, amount, currency),
            "FAILURE" or "FAILED" or "EXPIRED" or "CANCELLED" => new PaymentVerification(PaymentVerificationStatus.Failed, paymentId, amount, currency),
            _ => new PaymentVerification(PaymentVerificationStatus.Pending, paymentId, amount, currency)
        };
    }

    private sealed class GeneratePaymentRequest
    {
        [JsonPropertyName("app_token")] public string AppToken { get; set; } = "";
        [JsonPropertyName("app_secret")] public string AppSecret { get; set; } = "";
        [JsonPropertyName("amount")] public string Amount { get; set; } = "";
        [JsonPropertyName("accept_card")] public bool AcceptCard { get; set; }
        [JsonPropertyName("session_timeout_secs")] public int SessionTimeoutSecs { get; set; }
        [JsonPropertyName("success_link")] public string SuccessLink { get; set; } = "";
        [JsonPropertyName("fail_link")] public string FailLink { get; set; } = "";
        [JsonPropertyName("developer_tracking_id")] public string DeveloperTrackingId { get; set; } = "";
    }

    private sealed class GeneratePaymentResponse
    {
        [JsonPropertyName("result")] public GeneratePaymentResult? Result { get; set; }
    }

    private sealed class GeneratePaymentResult
    {
        [JsonPropertyName("link")] public string? Link { get; set; }
        [JsonPropertyName("payment_id")] public string? PaymentId { get; set; }
    }

    private sealed class VerifyPaymentResponse
    {
        [JsonPropertyName("result")] public VerifyPaymentResult? Result { get; set; }
    }

    private sealed class VerifyPaymentResult
    {
        [JsonPropertyName("status")] public string? Status { get; set; }
        // Amount actually paid, in millimes. Flouci returns it as a number.
        [JsonPropertyName("amount")] public long? Amount { get; set; }
        [JsonPropertyName("currency")] public string? Currency { get; set; }
    }
}
