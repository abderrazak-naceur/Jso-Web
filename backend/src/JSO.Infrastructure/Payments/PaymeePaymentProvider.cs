using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using JSO.Domain;
using Microsoft.Extensions.Logging;

namespace JSO.Infrastructure.Payments;

public sealed class PaymeePaymentProvider(
    IHttpClientFactory httpClientFactory,
    PaymentConfigurationStore store,
    ILogger<PaymeePaymentProvider> logger) : IPaymentProvider
{
    public string Name => "Paymee";

    public bool IsConfigured => store.HasActiveConfiguredByCode("PAYMEE");

    public async Task<PaymentInitiation> InitiatePaymentAsync(
        PaymentRequest payable,
        string returnUrl,
        string cancelUrl,
        CancellationToken ct)
    {
        var (provider, secrets) = await store.GetActiveForServerByCodeAsync("PAYMEE", ct);
        if (provider is null ||
            !secrets.TryGetValue("apiKey", out var apiKey) ||
            string.IsNullOrWhiteSpace(apiKey))
            throw new PaymentProviderNotConfiguredException(Name);

        if (string.IsNullOrWhiteSpace(payable.Email))
            throw new PaymentProviderException("Paymee exige une adresse e-mail client pour initier le paiement.");
        if (string.IsNullOrWhiteSpace(payable.Phone))
            throw new PaymentProviderException("Paymee exige un numéro de téléphone client pour initier le paiement.");

        var baseUrl = string.IsNullOrWhiteSpace(provider.BaseUrl)
            ? "https://app.paymee.tn/api/v2/"
            : provider.BaseUrl.TrimEnd('/') + "/";

        var webhookUrl = ReadSettings(provider.SettingsJson).WebhookUrl;
        if (string.IsNullOrWhiteSpace(webhookUrl))
            throw new PaymentProviderException("L'URL webhook Paymee doit être configurée dans Admin → Configuration → Paiements.");

        var firstName = string.IsNullOrWhiteSpace(payable.FirstName) ? "JSO" : payable.FirstName.Trim();
        var lastName = string.IsNullOrWhiteSpace(payable.LastName) ? "Support" : payable.LastName.Trim();
        var phone = payable.Phone.Trim();

        var request = new CreatePaymentRequest
        {
            Amount = Math.Round(payable.AmountTnd, 2, MidpointRounding.AwayFromZero),
            Note = payable.Description,
            FirstName = firstName,
            LastName = lastName,
            Email = payable.Email.Trim(),
            Phone = phone,
            ReturnUrl = returnUrl,
            CancelUrl = cancelUrl,
            WebhookUrl = webhookUrl,
            OrderId = $"{payable.PayableType}:{payable.PayableId:N}"
        };

        using var http = httpClientFactory.CreateClient();
        http.BaseAddress = new Uri(baseUrl);
        http.Timeout = TimeSpan.FromSeconds(20);
        using var message = new HttpRequestMessage(HttpMethod.Post, "payments/create");
        message.Headers.TryAddWithoutValidation("Authorization", "Token " + apiKey);
        message.Content = JsonContent.Create(request);

        using var response = await http.SendAsync(message, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Paymee payment creation failed with status {Status}", (int)response.StatusCode);
            throw new PaymentProviderException("Paymee a refusé la demande de paiement.");
        }

        var payload = await response.Content.ReadFromJsonAsync<CreatePaymentResponse>(cancellationToken: ct);
        var data = payload?.Data;
        if (data is null || string.IsNullOrWhiteSpace(data.Token) || string.IsNullOrWhiteSpace(data.PaymentUrl))
            throw new PaymentProviderException("Réponse invalide de Paymee.");

        return new PaymentInitiation(data.PaymentUrl, data.Token, request.Amount, "TND");
    }

    // Paymee signs webhook data with MD5(token + payment_status + API token).
    // The webhook is accepted only when the checksum is valid and payment_status
    // is true; the webhook also binds the signed token to the stored payable.
    public bool VerifyWebhookChecksum(string token, bool paymentStatus, string checkSum, string apiKey)
    {
        var raw = token + (paymentStatus ? "1" : "0") + apiKey;
        var expected = Convert.ToHexString(MD5.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(checkSum.Trim().ToLowerInvariant()));
    }

    public static PaymeeSettings ReadSettings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try
        {
            return JsonSerializer.Deserialize<PaymeeSettings>(
                json, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new();
        }
        catch (JsonException) { return new(); }
    }

    private sealed class CreatePaymentRequest
    {
        [JsonPropertyName("amount")] public decimal Amount { get; set; }
        [JsonPropertyName("note")] public string Note { get; set; } = "";
        [JsonPropertyName("first_name")] public string FirstName { get; set; } = "";
        [JsonPropertyName("last_name")] public string LastName { get; set; } = "";
        [JsonPropertyName("email")] public string Email { get; set; } = "";
        [JsonPropertyName("phone")] public string Phone { get; set; } = "";
        [JsonPropertyName("return_url")] public string ReturnUrl { get; set; } = "";
        [JsonPropertyName("cancel_url")] public string CancelUrl { get; set; } = "";
        [JsonPropertyName("webhook_url")] public string WebhookUrl { get; set; } = "";
        [JsonPropertyName("order_id")] public string OrderId { get; set; } = "";
    }

    private sealed class CreatePaymentResponse
    {
        [JsonPropertyName("status")] public bool Status { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
        [JsonPropertyName("data")] public CreatePaymentData? Data { get; set; }
    }

    private sealed class CreatePaymentData
    {
        [JsonPropertyName("token")] public string? Token { get; set; }
        [JsonPropertyName("payment_url")] public string? PaymentUrl { get; set; }
    }

    public sealed class PaymeeSettings
    {
        public string? WebhookUrl { get; set; }
        public string? Environment { get; set; } = "production";
    }
}
