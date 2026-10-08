using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Mvc;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/webhooks/konnect")]
public sealed class KonnectWebhookController(
    KonnectPaymentProvider konnect,
    PayableCompletionRouter completionRouter,
    ILogger<KonnectWebhookController> logger) : ControllerBase
{
    // Konnect calls this endpoint with GET ?payment_ref=...
    // The notification is never trusted by itself: we always re-query Konnect
    // with the server-side API key before completing the payable.
    [HttpGet]
    public async Task<IActionResult> Receive([FromQuery(Name = "payment_ref")] string? paymentRef, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(paymentRef))
            return BadRequest(new { message = "payment_ref is required." });

        PaymentVerification verification;
        try
        {
            verification = await konnect.VerifyPaymentAsync(paymentRef.Trim(), ct);
        }
        catch (PaymentProviderNotConfiguredException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
        catch (PaymentProviderException ex)
        {
            logger.LogWarning(ex, "Konnect webhook verification failed for {PaymentRef}", paymentRef);
            return StatusCode(StatusCodes.Status502BadGateway);
        }

        if (verification.Status == PaymentVerificationStatus.Pending)
            return Ok(new { received = true, status = "pending" });

        if (verification.Status != PaymentVerificationStatus.Succeeded)
            return Ok(new { received = true, status = "failed" });

        if (string.IsNullOrWhiteSpace(verification.PayableReference))
            return BadRequest(new { message = "Konnect payment has no orderId." });

        if (!TryParsePayableReference(verification.PayableReference, out var payableType, out var payableId))
            return BadRequest(new { message = "Invalid Konnect orderId." });

        if (!completionRouter.IsKnownType(payableType))
            return BadRequest(new { message = "Unknown payable type." });

        var expectedAmount = await completionRouter.GetExpectedAmountTndAsync(payableType, payableId, ct);
        if (expectedAmount is null)
            return NotFound(new { message = "Payable not found." });

        if (verification.Amount is null || !string.Equals(verification.Currency, "TND", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Konnect payment amount/currency is invalid." });

        var paidAmountTnd = verification.Amount.Value / 1000m;
        if (Math.Abs(paidAmountTnd - expectedAmount.Value) > 0.001m)
        {
            logger.LogWarning(
                "Konnect amount mismatch for {PaymentRef}: expected {Expected}, received {Received}",
                paymentRef, expectedAmount.Value, paidAmountTnd);
            return BadRequest(new { message = "Payment amount does not match the payable." });
        }

        var result = await completionRouter.CompleteAsync(
            payableType,
            payableId,
            konnect.Name,
            verification.ProviderRef,
            ct);

        return result switch
        {
            PayableCompletionResult.Completed => Ok(new { received = true, status = "completed" }),
            PayableCompletionResult.AlreadyCompleted => Ok(new { received = true, status = "already_completed" }),
            PayableCompletionResult.NotFound => NotFound(new { message = "Payable not found." }),
            _ => StatusCode(StatusCodes.Status409Conflict, new { message = "Payable could not be completed." })
        };
    }

    private static bool TryParsePayableReference(string value, out string payableType, out Guid payableId)
    {
        payableType = "";
        payableId = Guid.Empty;

        var separator = value.IndexOf(':');
        if (separator <= 0 || separator == value.Length - 1)
            return false;

        payableType = value[..separator].Trim();
        return Guid.TryParse(value[(separator + 1)..].Trim(), out payableId);
    }
}
