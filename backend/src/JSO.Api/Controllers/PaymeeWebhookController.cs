using System.Globalization;
using System.Text.Json;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/webhooks/paymee")]
public sealed class PaymeeWebhookController(
    JsoDbContext db,
    PaymeePaymentProvider paymee,
    PaymentConfigurationStore store,
    PayableCompletionRouter completionRouter,
    ILogger<PaymeeWebhookController> logger) : ControllerBase
{
    [HttpPost]
    [HttpGet]
    public async Task<IActionResult> Receive(
        [FromQuery] string? token,
        [FromQuery(Name = "check_sum")] string? checkSum,
        [FromQuery(Name = "payment_status")] bool? paymentStatus,
        [FromQuery(Name = "order_id")] string? orderId,
        [FromQuery] decimal? amount,
        CancellationToken ct)
    {
        if (Request.Method == HttpMethods.Post && Request.HasFormContentType)
        {
            var form = await Request.ReadFormAsync(ct);
            token ??= form["token"].FirstOrDefault();
            checkSum ??= form["check_sum"].FirstOrDefault();
            if (!paymentStatus.HasValue && bool.TryParse(form["payment_status"].FirstOrDefault(), out var parsed))
                paymentStatus = parsed;
            orderId ??= form["order_id"].FirstOrDefault();
            if (!amount.HasValue && decimal.TryParse(form["amount"].FirstOrDefault(), NumberStyles.Any, CultureInfo.InvariantCulture, out var parsedAmount))
                amount = parsedAmount;
        }
        else if (Request.Method == HttpMethods.Post && Request.ContentType?.Contains("json", StringComparison.OrdinalIgnoreCase) == true)
        {
            try
            {
                using var document = await JsonDocument.ParseAsync(Request.Body, cancellationToken: ct);
                var payload = document.RootElement;
                if (payload.ValueKind != JsonValueKind.Object)
                    return BadRequest(new { message = "Paymee webhook payload invalide." });

                token ??= GetString(payload, "token");
                checkSum ??= GetString(payload, "check_sum");
                orderId ??= GetString(payload, "order_id");
                if (!paymentStatus.HasValue && payload.TryGetProperty("payment_status", out var statusValue))
                    paymentStatus = statusValue.ValueKind is JsonValueKind.True or JsonValueKind.False
                        ? statusValue.GetBoolean()
                        : bool.TryParse(statusValue.ToString(), out var parsedStatus) ? parsedStatus : null;
                if (!amount.HasValue && payload.TryGetProperty("amount", out var amountValue)
                    && decimal.TryParse(amountValue.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var parsedAmount))
                    amount = parsedAmount;
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "Paymee webhook payload invalide." });
            }
        }

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(checkSum) || !paymentStatus.HasValue)
            return BadRequest(new { message = "Paymee webhook payload incomplet." });

        var (_, secrets) = await store.GetActiveForServerByCodeAsync("PAYMEE", ct);
        if (!secrets.TryGetValue("apiKey", out var apiKey) || string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        if (!paymee.VerifyWebhookChecksum(token, paymentStatus.Value, checkSum, apiKey))
            return Unauthorized();

        if (!paymentStatus.Value)
            return Ok(new { received = true, status = "failed" });

        if (!TryParseOrderId(orderId, out var payableType, out var payableId))
            return BadRequest(new { message = "Paymee order_id invalide." });

        // Paymee signs the token and payment status, but not order_id or amount.
        // Bind the signed token to the payable saved when payment was initiated.
        if (!await HasMatchingProviderRefAsync(payableType, payableId, token.Trim(), ct))
            return NotFound(new { message = "Référence Paymee introuvable pour ce payable." });

        var expected = await completionRouter.GetExpectedAmountTndAsync(payableType, payableId, ct);
        if (expected is null)
            return NotFound(new { message = "Payable introuvable." });

        if (amount.HasValue && Math.Abs(amount.Value - expected.Value) > 0.001m)
        {
            logger.LogWarning("Paymee amount mismatch for {Token}: expected {Expected}, received {Received}", token, expected, amount);
            return BadRequest(new { message = "Le montant Paymee ne correspond pas au payable." });
        }

        var result = await completionRouter.CompleteAsync(
            payableType, payableId, paymee.Name, token.Trim(), ct);

        return result switch
        {
            PayableCompletionResult.Completed or PayableCompletionResult.AlreadyCompleted =>
                Ok(new { received = true, status = "completed" }),
            PayableCompletionResult.NotFound => NotFound(),
            _ => Conflict(new { message = "Payable non finalisable." })
        };
    }

    private static string? GetString(JsonElement payload, string propertyName) =>
        payload.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private Task<bool> HasMatchingProviderRefAsync(string type, Guid id, string token, CancellationToken ct) => type switch
    {
        PayableTypes.ShopOrder => db.Orders.AnyAsync(x => x.Id == id && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        PayableTypes.TicketOrder => db.TicketOrders.AnyAsync(x => x.Id == id && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        PayableTypes.Donation => db.SupporterBricks.AnyAsync(x => x.Id == id && x.Status == "Donation" && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        PayableTypes.SupporterBrick => db.SupporterBricks.AnyAsync(x => x.Id == id && x.Status != "Donation" && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        PayableTypes.Membership => db.Memberships.AnyAsync(x => x.Id == id && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        PayableTypes.MatchStreamAccess => db.MatchStreamAccesses.AnyAsync(x => x.Id == id && x.ProviderRef == token && x.PaymentProvider == paymee.Name, ct),
        _ => Task.FromResult(false)
    };

    private static bool TryParseOrderId(string? value, out string type, out Guid id)
    {
        type = "";
        id = Guid.Empty;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var separator = value.IndexOf(':');
        if (separator <= 0 || separator == value.Length - 1) return false;
        type = value[..separator].Trim();
        return Guid.TryParse(value[(separator + 1)..].Trim(), out id)
            && type is PayableTypes.ShopOrder or PayableTypes.TicketOrder or PayableTypes.SupporterBrick
                or PayableTypes.Membership or PayableTypes.MatchStreamAccess or PayableTypes.Donation;
    }
}
