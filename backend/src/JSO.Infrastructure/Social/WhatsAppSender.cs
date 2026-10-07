using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JSO.Infrastructure.Social;

public sealed class WhatsAppOptions
{
    public string GraphApiVersion { get; set; } = "v23.0";
    public string PhoneNumberId { get; set; } = "";
    public string AccessToken { get; set; } = "";
    public string TemplateName { get; set; } = "jso_donation_receipt";
    public string LanguageCode { get; set; } = "fr";
    public string ReceiptBaseUrl { get; set; } = "";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PhoneNumberId) &&
        !string.IsNullOrWhiteSpace(AccessToken) &&
        !string.IsNullOrWhiteSpace(TemplateName) &&
        !string.IsNullOrWhiteSpace(ReceiptBaseUrl);
}

public sealed record WhatsAppSendResult(bool Sent, bool NotConfigured, string Message)
{
    public static WhatsAppSendResult Ok() => new(true, false, "WhatsApp envoyé.");
    public static WhatsAppSendResult Missing() => new(false, true, "WhatsApp n'est pas configuré.");
    public static WhatsAppSendResult Failed(string message) => new(false, false, message);
}

public sealed class WhatsAppSender(
    HttpClient http,
    IOptions<SocialOptions> options,
    ILogger<WhatsAppSender> logger)
{
    private readonly WhatsAppOptions _options = options.Value.WhatsApp;

    public bool IsConfigured => _options.IsConfigured;

    public async Task<WhatsAppSendResult> SendDonationReceiptAsync(
        Guid donationId,
        string? phone,
        bool optedIn,
        string donorName,
        decimal amount,
        string currency,
        string? receiptNumber,
        CancellationToken ct)
    {
        if (!optedIn || string.IsNullOrWhiteSpace(phone))
            return WhatsAppSendResult.Missing();

        if (!_options.IsConfigured)
        {
            logger.LogInformation("WhatsApp donation receipt skipped because WhatsApp is not configured.");
            return WhatsAppSendResult.Missing();
        }

        var to = NormalizePhone(phone);
        if (to is null)
            return WhatsAppSendResult.Failed("Numéro WhatsApp invalide.");

        var receiptUrl = $"{_options.ReceiptBaseUrl.TrimEnd('/')}/api/donations/{donationId}/receipt";
        var template = new
        {
            name = _options.TemplateName,
            language = new { code = _options.LanguageCode },
            components = new object[]
            {
                new
                {
                    type = "body",
                    parameters = new object[]
                    {
                        new { type = "text", text = donorName },
                        new { type = "text", text = $"{amount:0.00} {currency}" },
                        new { type = "text", text = receiptNumber ?? donationId.ToString() },
                        new { type = "text", text = receiptUrl }
                    }
                }
            }
        };

        var payload = new
        {
            messaging_product = "whatsapp",
            recipient_type = "individual",
            to,
            type = "template",
            template
        };

        try
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{_options.GraphApiVersion}/{_options.PhoneNumberId}/messages");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.AccessToken);
            request.Content = JsonContent.Create(payload);

            using var response = await http.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
                return WhatsAppSendResult.Ok();

            var body = await response.Content.ReadAsStringAsync(ct);
            string? reason = null;
            try
            {
                using var json = JsonDocument.Parse(body);
                reason = json.RootElement.GetProperty("error").GetProperty("message").GetString();
            }
            catch (JsonException) { }

            logger.LogWarning(
                "WhatsApp donation receipt failed with HTTP {StatusCode}: {Reason}",
                (int)response.StatusCode,
                reason ?? $"HTTP {(int)response.StatusCode}");

            return WhatsAppSendResult.Failed("WhatsApp n'a pas accepté l'envoi du reçu.");
        }
        catch (HttpRequestException)
        {
            logger.LogWarning("WhatsApp Graph API is unreachable while sending donation receipt.");
            return WhatsAppSendResult.Failed("WhatsApp est temporairement injoignable.");
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning("WhatsApp Graph API timed out while sending donation receipt.");
            return WhatsAppSendResult.Failed("WhatsApp a dépassé le délai d'attente.");
        }
    }

    private static string? NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00", StringComparison.Ordinal))
            digits = digits[2..];

        // Tunisia local mobile number: 8 digits. Add country code when omitted.
        if (digits.Length == 8)
            digits = "216" + digits;

        return digits.Length is >= 10 and <= 15 ? digits : null;
    }
}
