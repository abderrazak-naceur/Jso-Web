using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace JSO.Infrastructure.Payments;

public sealed class KonnectPaymentProvider(
    IHttpClientFactory httpClientFactory,
    PaymentConfigurationStore store,
    ILogger<KonnectPaymentProvider> logger) : IPaymentProvider
{
    public string Name => "Konnect";

    public bool IsConfigured => store.HasActiveConfiguredByCode("KONNECT");

    public async Task<PaymentInitiation> InitiatePaymentAsync(
        PaymentRequest payable,
        string returnUrl,
        string cancelUrl,
        CancellationToken ct)
    {
        var (provider, secrets) = await store.GetActiveForServerByCodeAsync("KONNECT", ct);
        if (provider is null)
            throw new PaymentProviderNotConfiguredException(Name);

        if (!secrets.TryGetValue("apiKey", out var apiKey) || string.IsNullOrWhiteSpace(apiKey) ||
            !secrets.TryGetValue("receiverWalletId", out var walletId) || string.IsNullOrWhiteSpace(walletId))
            throw new PaymentProviderNotConfiguredException(Name);

        var settings = ReadSettings(provider.SettingsJson);
        var baseUrl = string.IsNullOrWhiteSpace(provider.BaseUrl)
            ? "https://api.konnect.network/api/v2/"
            : provider.BaseUrl.TrimEnd('/') + "/";

        var amountMillimes = checked((long)Math.Round(
            payable.AmountTnd * 1000m, MidpointRounding.AwayFromZero));

        var orderId = payable.PayableId.ToString("N");
        var request = new InitPaymentRequest
        {
            ReceiverWalletId = walletId,
            Token = provider.Currency?.Trim().ToUpperInvariant() is "EUR" or "USD" ? provider.Currency.Trim().ToUpperInvariant() : "TND",
            Amount = amountMillimes,
            Type = "immediate",
            Description = payable.Description,
            AcceptedPaymentMethods = settings.AcceptedPaymentMethods,
            Lifespan = settings.LifespanMinutes,
            CheckoutForm = settings.CheckoutForm,
            AddPaymentFeesToAmount = settings.AddPaymentFeesToAmount,
            OrderId = orderId,
            Webhook = settings.WebhookUrl,
            SuccessUrl = returnUrl,
            FailUrl = cancelUrl,
            Theme = settings.Theme
        };

        var client = httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(20);
        using var message = new HttpRequestMessage(HttpMethod.Post, "payments/init-payment");
        message.Headers.TryAddWithoutValidation("x-api-key", apiKey);
        message.Content = JsonContent.Create(request);

        using var response = await client.SendAsync(message, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Konnect init-payment failed with status {Status}", (int)response.StatusCode);
            throw new PaymentProviderException("Konnect a refusé la demande de paiement.");
        }

        var payload = await response.Content.ReadFromJsonAsync<InitPaymentResponse>(cancellationToken: ct);
        if (string.IsNullOrWhiteSpace(payload?.PayUrl) || string.IsNullOrWhiteSpace(payload.PaymentRef))
            throw new PaymentProviderException("Réponse invalide de Konnect.");

        return new PaymentInitiation(payload.PayUrl, payload.PaymentRef, payable.AmountTnd, request.Token);
    }

    public async Task<PaymentVerification> VerifyPaymentAsync(string paymentRef, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(paymentRef))
            return new PaymentVerification(PaymentVerificationStatus.Failed, paymentRef);

        var (provider, secrets) = await store.GetActiveForServerByCodeAsync("KONNECT", ct);
        if (provider is null ||
            !secrets.TryGetValue("apiKey", out var apiKey) ||
            string.IsNullOrWhiteSpace(apiKey))
            throw new PaymentProviderNotConfiguredException(Name);

        var baseUrl = string.IsNullOrWhiteSpace(provider.BaseUrl)
            ? "https://api.konnect.network/api/v2/"
            : provider.BaseUrl.TrimEnd('/') + "/";

        var client = httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(15);
        using var message = new HttpRequestMessage(
            HttpMethod.Get, $"payments/{Uri.EscapeDataString(paymentRef)}");
        message.Headers.TryAddWithoutValidation("x-api-key", apiKey);

        using var response = await client.SendAsync(message, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Konnect payment lookup failed with status {Status}", (int)response.StatusCode);
            return new PaymentVerification(PaymentVerificationStatus.Pending, paymentRef);
        }

        var payload = await response.Content.ReadFromJsonAsync<GetPaymentResponse>(cancellationToken: ct);
        var payment = payload?.Payment;
        var status = payment?.Status?.Trim().ToLowerInvariant();

        return status switch
        {
            "completed" => new PaymentVerification(
                PaymentVerificationStatus.Succeeded,
                paymentRef,
                payment.Amount,
                payment.Token),
            "pending" => new PaymentVerification(
                PaymentVerificationStatus.Pending,
                paymentRef,
                payment.Amount,
                payment.Token),
            _ => new PaymentVerification(
                PaymentVerificationStatus.Failed,
                paymentRef,
                payment?.Amount,
                payment?.Token)
        };
    }

    private static KonnectSettings ReadSettings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new KonnectSettings();

        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<KonnectSettings>(json,
                new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))
                ?? new KonnectSettings();
        }
        catch (System.Text.Json.JsonException)
        {
            return new KonnectSettings();
        }
    }

    private sealed class InitPaymentRequest
    {
        [JsonPropertyName("receiverWalletId")] public string ReceiverWalletId { get; set; } = "";
        [JsonPropertyName("token")] public string Token { get; set; } = "TND";
        [JsonPropertyName("amount")] public long Amount { get; set; }
        [JsonPropertyName("type")] public string Type { get; set; } = "immediate";
        [JsonPropertyName("description")] public string Description { get; set; } = "";
        [JsonPropertyName("acceptedPaymentMethods")] public IReadOnlyList<string> AcceptedPaymentMethods { get; set; } = ["wallet", "bank_card", "e-DINAR"];
        [JsonPropertyName("lifespan")] public int Lifespan { get; set; } = 20;
        [JsonPropertyName("checkoutForm")] public bool CheckoutForm { get; set; } = true;
        [JsonPropertyName("addPaymentFeesToAmount")] public bool AddPaymentFeesToAmount { get; set; }
        [JsonPropertyName("orderId")] public string OrderId { get; set; } = "";
        [JsonPropertyName("webhook")] public string? Webhook { get; set; }
        [JsonPropertyName("successUrl")] public string? SuccessUrl { get; set; }
        [JsonPropertyName("failUrl")] public string? FailUrl { get; set; }
        [JsonPropertyName("theme")] public string Theme { get; set; } = "light";
    }

    private sealed class InitPaymentResponse
    {
        [JsonPropertyName("payUrl")] public string? PayUrl { get; set; }
        [JsonPropertyName("paymentRef")] public string? PaymentRef { get; set; }
    }

    private sealed class GetPaymentResponse
    {
        [JsonPropertyName("payment")] public PaymentDetails? Payment { get; set; }
    }

    private sealed class PaymentDetails
    {
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("amount")] public long? Amount { get; set; }
        [JsonPropertyName("token")] public string? Token { get; set; }
    }

    public sealed class KonnectSettings
    {
        public List<string> AcceptedPaymentMethods { get; set; } = ["wallet", "bank_card", "e-DINAR"];
        public int LifespanMinutes { get; set; } = 20;
        public bool CheckoutForm { get; set; } = true;
        public bool AddPaymentFeesToAmount { get; set; }
        public string? WebhookUrl { get; set; }
        public string Theme { get; set; } = "light";
    }
}
