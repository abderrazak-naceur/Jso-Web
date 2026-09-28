using System.Security.Cryptography;
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
//     before completing the payable. A SUCCESS whose verify response omits the
//     amount/currency is treated as a mismatch (left pending), not as trust. In
//     Production a configured Payments:Flouci:WebhookSecret is mandatory.
// Both handlers are GENERIC over the payable: from the provider metadata
// (Stripe) or the stored ProviderRef (Flouci) they resolve a PayableType +
// PayableId and delegate to the shared PayableCompletionRouter, which
// cross-checks the expected amount and completes the payable idempotently
// (shop order = mark paid + decrement stock; ticket order = confirm + increment
// capacity; supporter brick = mark paid). Secrets are never logged and never
// returned in responses.
[ApiController]
[AllowAnonymous]
[Route("api/payments")]
public sealed class PaymentsController(
    JsoDbContext db,
    PayableCompletionRouter completions,
    AuditService audit,
    StripePaymentProvider stripe,
    PaymentProviderSelector selector,
    Microsoft.Extensions.Options.IOptions<PaymentOptions> paymentOptions,
    Microsoft.Extensions.Hosting.IHostEnvironment environment,
    ILogger<PaymentsController> logger) : ControllerBase
{
    private const string FlouciWebhookSecretHeader = "X-Flouci-Webhook-Secret";

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

        // Only a fully paid session should complete the payable.
        if (!string.Equals(session.PaymentStatus, "paid", StringComparison.OrdinalIgnoreCase))
            return Ok();

        var payable = ResolvePayableFromSession(session);
        if (payable is null)
        {
            logger.LogWarning("Stripe webhook: could not resolve a payable for session {SessionId}", session.Id);
            return Ok();
        }

        var (payableType, payableId) = payable.Value;

        // Cross-check the amount/currency Stripe actually settled against what we
        // intended to charge for this payable. The expected charge is the
        // payable's TND amount converted at the configured Stripe rate. A
        // mismatch (tampered/stale session) leaves the payable pending.
        var expectedTnd = await completions.GetExpectedAmountTndAsync(payableType, payableId, ct);
        if (expectedTnd is null)
        {
            logger.LogWarning("Stripe webhook: session {SessionId} references an unknown {PayableType}", session.Id, payableType);
            return Ok();
        }

        var expectedMinor = stripe.ExpectedMinorUnits(expectedTnd.Value);
        var expectedCurrency = stripe.ChargeCurrency;
        var paidMinor = session.AmountTotal ?? 0;
        var paidCurrency = session.Currency?.Trim().ToUpperInvariant();
        if (paidMinor != expectedMinor
            || !string.Equals(paidCurrency, expectedCurrency, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Stripe webhook: amount/currency mismatch for {PayableType} {PayableId} (expected {ExpectedMinor} {ExpectedCurrency}), leaving pending",
                payableType, payableId, expectedMinor, expectedCurrency);
            await audit.LogAsync("PAYMENT_MISMATCH", payableType, payableId.ToString(), null, null,
                HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Stripe" }, ct);
            return Ok();
        }

        var result = await completions.CompleteAsync(payableType, payableId, "Stripe", session.Id, ct);
        await audit.LogAsync("PAYMENT_COMPLETED_WEBHOOK", payableType, payableId.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Stripe", result = result.ToString() }, ct);

        return Ok();
    }

    [HttpPost("flouci/webhook")]
    public async Task<IActionResult> FlouciWebhook(CancellationToken ct)
    {
        var flouci = selector.Flouci;
        if (!flouci.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable);

        // Shared-secret guard. Flouci does not send a verifiable signature, so
        // authenticity ultimately rests on the verify_payment call below; a
        // configured secret additionally requires a matching header/query value
        // to reduce unauthenticated abuse and verify-call amplification. In
        // Production the secret is MANDATORY: an unconfigured secret rejects the
        // request (503) instead of leaving the endpoint anonymous. In
        // Development the endpoint stays open to keep local testing simple.
        if (string.IsNullOrWhiteSpace(paymentOptions.Value.Flouci.WebhookSecret)
            && environment.IsProduction())
        {
            logger.LogWarning("Flouci webhook rejected: WebhookSecret is not configured in Production");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        if (!IsFlouciWebhookAuthorized())
            return Unauthorized();

        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);

        var paymentId = ExtractFlouciPaymentId(body) ?? Request.Query["payment_id"].ToString();
        if (string.IsNullOrWhiteSpace(paymentId))
            return BadRequest();

        // Authoritative: never trust the notification. Ask Flouci with our secret.
        var verification = await flouci.VerifyPaymentAsync(paymentId, ct);
        if (verification.Status != PaymentVerificationStatus.Succeeded)
            return Ok(); // pending/failed -> nothing to do (idempotent, safe to retry)

        // Reconcile the payment id (stored as ProviderRef at initiation) with the
        // payable. Flouci carries no metadata, so we look the reference up across
        // the payable tables and derive its PayableType.
        var payable = await ResolvePayableFromProviderRefAsync(paymentId, ct);
        if (payable is null)
        {
            logger.LogWarning("Flouci webhook: no payable matches the verified payment reference");
            return Ok();
        }

        var (payableType, payableId) = payable.Value;

        var expectedTnd = await completions.GetExpectedAmountTndAsync(payableType, payableId, ct);
        if (expectedTnd is null)
        {
            logger.LogWarning("Flouci webhook: verified reference resolves to an unknown {PayableType}", payableType);
            return Ok();
        }

        // Cross-check the verified amount/currency against the expected TND amount
        // (in millimes). A SUCCESS with a MISSING amount or currency is treated as
        // a mismatch, NOT as trust: without the settled amount we cannot confirm
        // the buyer paid what we intended, so the payable stays Pending and we
        // record a mismatch audit (safe to retry once Flouci reports the amount).
        var expectedMillimes = (long)Math.Round(expectedTnd.Value * 1000m, MidpointRounding.AwayFromZero);
        var paidMillimes = verification.Amount;
        var paidCurrency = verification.Currency;
        if (paidMillimes is not { } settledMillimes
            || settledMillimes != expectedMillimes
            || string.IsNullOrWhiteSpace(paidCurrency)
            || !string.Equals(paidCurrency, "TND", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Flouci webhook: amount/currency missing or mismatched for {PayableType} {PayableId} (expected {ExpectedMillimes} millimes TND), leaving pending",
                payableType, payableId, expectedMillimes);
            await audit.LogAsync("PAYMENT_MISMATCH", payableType, payableId.ToString(), null, null,
                HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Flouci" }, ct);
            return Ok();
        }

        var result = await completions.CompleteAsync(payableType, payableId, "Flouci", paymentId, ct);
        await audit.LogAsync("PAYMENT_COMPLETED_WEBHOOK", payableType, payableId.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { provider = "Flouci", result = result.ToString() }, ct);

        return Ok();
    }

    // When a Flouci webhook shared secret is configured, require a matching value
    // in the X-Flouci-Webhook-Secret header (or ?webhookSecret= query) using a
    // constant-time comparison. When no secret is configured this returns true;
    // the caller enforces that the unconfigured case is only allowed outside
    // Production (in Production the missing secret is already rejected upstream).
    private bool IsFlouciWebhookAuthorized()
    {
        var configured = paymentOptions.Value.Flouci.WebhookSecret;
        if (string.IsNullOrWhiteSpace(configured))
            return true;

        var provided = Request.Headers[FlouciWebhookSecretHeader].ToString();
        if (string.IsNullOrEmpty(provided))
            provided = Request.Query["webhookSecret"].ToString();

        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(provided),
            System.Text.Encoding.UTF8.GetBytes(configured));
    }

    // Resolves the (PayableType, PayableId) from a Stripe session. New sessions
    // carry the generic payableType/payableId metadata; legacy sessions carry
    // only the "orderId" metadata / ClientReferenceId, which we still treat as a
    // ShopOrder for backward compatibility.
    private (string PayableType, Guid PayableId)? ResolvePayableFromSession(Session session)
    {
        var meta = session.Metadata;
        if (meta is not null
            && meta.TryGetValue(StripePaymentProvider.PayableTypeMetadataKey, out var typeMeta)
            && !string.IsNullOrWhiteSpace(typeMeta)
            && meta.TryGetValue(StripePaymentProvider.PayableIdMetadataKey, out var idMeta)
            && Guid.TryParse(idMeta, out var payableId)
            && completions.IsKnownType(typeMeta))
        {
            return (typeMeta, payableId);
        }

        // Backward compatibility: legacy shop-order sessions.
        if (meta is not null
            && meta.TryGetValue(StripePaymentProvider.OrderIdMetadataKey, out var legacyMeta)
            && Guid.TryParse(legacyMeta, out var fromLegacy))
            return (PayableTypes.ShopOrder, fromLegacy);

        if (Guid.TryParse(session.ClientReferenceId, out var fromRef))
            return (PayableTypes.ShopOrder, fromRef);

        return null;
    }

    // Resolves the (PayableType, PayableId) for a Flouci payment id by matching
    // the stored ProviderRef across the payable tables. ProviderRef is unique
    // per table (partial unique index), so at most one row matches per type.
    private async Task<(string PayableType, Guid PayableId)?> ResolvePayableFromProviderRefAsync(string providerRef, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .Where(x => x.ProviderRef == providerRef)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (order is { } orderId)
            return (PayableTypes.ShopOrder, orderId);

        var ticket = await db.TicketOrders.AsNoTracking()
            .Where(x => x.ProviderRef == providerRef)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (ticket is { } ticketId)
            return (PayableTypes.TicketOrder, ticketId);

        var brick = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.ProviderRef == providerRef)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (brick is { } brickId)
            return (PayableTypes.SupporterBrick, brickId);

        var membership = await db.Memberships.AsNoTracking()
            .Where(x => x.ProviderRef == providerRef)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (membership is { } membershipId)
            return (PayableTypes.Membership, membershipId);

        var streamAccess = await db.MatchStreamAccesses.AsNoTracking()
            .Where(x => x.ProviderRef == providerRef)
            .Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct);
        if (streamAccess is { } streamAccessId)
            return (PayableTypes.MatchStreamAccess, streamAccessId);

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
