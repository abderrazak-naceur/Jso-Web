using System.Text.Json;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;

namespace JSO.Api.Controllers;

// PUBLIC payment webhooks. These endpoints are called by the payment providers'
// servers, not by a logged-in user, so they are [AllowAnonymous]. Authenticity
// is enforced server-side:
//   - Stripe: the Stripe-Signature header is verified with the webhook signing
//     secret via the official Stripe.net EventUtility.ConstructEvent. We only
//     act on checkout.session.completed.
//   - Flouci: we do NOT trust the notification body. We extract the payment id
//     and call Flouci's verify endpoint with our secret to confirm "SUCCESS"
//     before marking the order paid.
// Both handlers are idempotent (they delegate to OrderPaymentService, which
// no-ops on an already-paid order) and audited. Secrets are never logged and
// never returned in responses.
[ApiController]
[AllowAnonymous]
[Route("api/payments")]
public sealed class PaymentsController(
    JsoDbContext db,
    OrderPaymentService payments,
    AuditService audit,
    StripePaymentProvider stripe,
    PaymentProviderSelector selector,
    ILogger<PaymentsController> logger) : ControllerBase
{
    [HttpPost("stripe/webhook")]
    public async Task<IActionResult> StripeWebhook(CancellationToken ct)
    {
        if (!stripe.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync(ct);
        var signature = Request.Headers["Stripe-Signature"].ToString();

        Event stripeEvent;
        try
        {
            stripeEvent = stripe.ConstructEvent(payload, signature);
        }
        catch (StripeException)
        {
            // Invalid signature -> reject. Do not reveal any detail.
            return BadRequest();
        }
        catch (PaymentProviderNotConfiguredException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        if (stripeEvent.Type != "checkout.session.completed")
            return Ok(); // acknowledge unrelated events

        if (stripeEvent.Data.Object is not Session session)
            return Ok();

        // Only a fully paid session should mark the order paid.
        if (!string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            return Ok();

        var orderId = ResolveOrderIdFromSession(session);
        if (orderId is null)
        {
            logger.LogWarning("Stripe webhook: could not resolve an order for session {SessionId}", session.Id);
            return Ok();
        }

        var result = await payments.MarkOrderPaidAsync(orderId.Value, "Stripe", session.Id, ct);
        await audit.LogAsync("ORDER_PAID_WEBHOOK", "Order", orderId.Value.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Stripe", result = result.ToString() }, ct);

        return Ok();
    }

    [HttpPost("flouci/webhook")]
    public async Task<IActionResult> FlouciWebhook(CancellationToken ct)
    {
        var flouci = selector.Flouci;
        if (!flouci.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        var paymentId = ExtractFlouciPaymentId(body) ?? Request.Query["payment_id"].ToString();
        if (string.IsNullOrWhiteSpace(paymentId))
            return BadRequest();

        // Authoritative: never trust the notification. Ask Flouci with our secret.
        var verification = await flouci.VerifyPaymentAsync(paymentId, ct);
        if (verification.Status != PaymentVerificationStatus.Succeeded)
            return Ok(); // pending/failed -> nothing to do (idempotent, safe to retry)

        // Reconcile the payment id (stored as ProviderRef at initiation) with the order.
        var order = await db.Orders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ProviderRef == paymentId, ct);
        if (order is null)
        {
            logger.LogWarning("Flouci webhook: no order matches the verified payment reference");
            return Ok();
        }

        var result = await payments.MarkOrderPaidAsync(order.Id, "Flouci", paymentId, ct);
        await audit.LogAsync("ORDER_PAID_WEBHOOK", "Order", order.Id.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Flouci", result = result.ToString() }, ct);

        return Ok();
    }

    private static Guid? ResolveOrderIdFromSession(Session session)
    {
        if (session.Metadata is not null
            && session.Metadata.TryGetValue(StripePaymentProvider.OrderIdMetadataKey, out var meta)
            && Guid.TryParse(meta, out var fromMeta))
            return fromMeta;

        if (Guid.TryParse(session.ClientReferenceId, out var fromRef))
            return fromRef;

        return null;
    }

    // Flouci notifications carry the payment id in a small JSON body. We only
    // read the id; the state is confirmed via the verify call, so the exact
    // shape is tolerated defensively.
    private static string? ExtractFlouciPaymentId(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return null;
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            foreach (var key in new[] { "payment_id", "paymentId", "id" })
            {
                if (root.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String)
                    return value.GetString();
            }
            if (root.TryGetProperty("result", out var result) && result.ValueKind == JsonValueKind.Object
                && result.TryGetProperty("payment_id", out var nested) && nested.ValueKind == JsonValueKind.String)
                return nested.GetString();
        }
        catch (JsonException)
        {
            return null;
        }
        return null;
    }
}
