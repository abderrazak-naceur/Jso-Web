using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JSO.Api.Controllers;

public sealed record NewsletterSubscribeRequest(string Email);

// Public newsletter endpoints (idea A4). Privacy by design:
// - Double opt-in: a subscription only becomes active after ConfirmedAt is set via the
//   confirmation link.
// - No user enumeration: /subscribe always returns the same generic success response
//   whether or not the email was already known.
// - Opaque tokens: confirm/unsubscribe use per-subscription tokens, never the Id.
// - No PII in logs: the confirmation token is logged (server-side only) as a stand-in for
//   the transactional email that would carry it. Sending real email is a TODO (see below).
[ApiController]
[Route("api/newsletter")]
public sealed class NewsletterController(JsoDbContext db, ILogger<NewsletterController> logger) : ControllerBase
{
    // Generic response reused for every subscribe outcome to avoid revealing whether an
    // email is already registered.
    private static readonly object GenericSubscribeResponse = new
    {
        message = "Si votre adresse est valide, vous recevrez un e-mail pour confirmer votre inscription."
    };

    [HttpPost("subscribe")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Subscribe(NewsletterSubscribeRequest request, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (email is null)
            return BadRequest(new { message = "Une adresse e-mail valide est requise." });

        var existing = await db.NewsletterSubscriptions.SingleOrDefaultAsync(x => x.Email == email, ct);
        if (existing is null)
        {
            var subscription = new NewsletterSubscription { Email = email };
            db.NewsletterSubscriptions.Add(subscription);
            await db.SaveChangesAsync(ct);
            LogPendingConfirmation(subscription);
        }
        else if (existing.ConfirmedAt is null || existing.Unsubscribed)
        {
            // Renew a pending or previously unsubscribed subscription: re-open it and issue a
            // fresh confirmation token so the double opt-in must be completed again.
            existing.Unsubscribed = false;
            existing.ConfirmedAt = null;
            existing.ConfirmToken = Guid.NewGuid().ToString("N");
            existing.ConfirmedOrUpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            LogPendingConfirmation(existing);
        }
        // Already confirmed and active: do nothing (idempotent), still return generic success.

        // TODO(newsletter): send the confirmation email through a transactional email provider
        // (e.g. SES/SendGrid/Mailgun within the free tier, paid at volume). Until then the
        // confirmation token is only logged server-side and no email leaves the system.
        return Ok(GenericSubscribeResponse);
    }

    [HttpGet("confirm")]
    public async Task<IActionResult> Confirm([FromQuery] string? token, CancellationToken ct) =>
        await ConfirmInternal(token, ct);

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmPost([FromQuery] string? token, CancellationToken ct) =>
        await ConfirmInternal(token, ct);

    private async Task<IActionResult> ConfirmInternal(string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Jeton de confirmation manquant." });

        var subscription = await db.NewsletterSubscriptions.SingleOrDefaultAsync(x => x.ConfirmToken == token, ct);
        if (subscription is null)
            return NotFound(new { message = "Jeton de confirmation invalide ou expiré." });

        if (subscription.ConfirmedAt is null)
        {
            subscription.ConfirmedAt = DateTimeOffset.UtcNow;
            subscription.Unsubscribed = false;
            subscription.ConfirmedOrUpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Ok(new { message = "Votre inscription à la newsletter est confirmée." });
    }

    [HttpGet("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string? token, CancellationToken ct) =>
        await UnsubscribeInternal(token, ct);

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> UnsubscribePost([FromQuery] string? token, CancellationToken ct) =>
        await UnsubscribeInternal(token, ct);

    private async Task<IActionResult> UnsubscribeInternal(string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Jeton de désinscription manquant." });

        var subscription = await db.NewsletterSubscriptions.SingleOrDefaultAsync(x => x.UnsubscribeToken == token, ct);
        if (subscription is null)
            return NotFound(new { message = "Jeton de désinscription invalide." });

        if (!subscription.Unsubscribed)
        {
            subscription.Unsubscribed = true;
            subscription.ConfirmedOrUpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Ok(new { message = "Vous avez été désinscrit de la newsletter." });
    }

    private void LogPendingConfirmation(NewsletterSubscription subscription) =>
        // Stand-in for the transactional email until a provider is wired up. Logs the token
        // only (not the email address) so no unnecessary PII is written to logs.
        logger.LogInformation(
            "Newsletter confirmation pending for subscription {SubscriptionId}. Confirm token issued (email delivery is a TODO).",
            subscription.Id);

    // Returns the normalized email, or null when the format is not acceptable.
    private static string? NormalizeEmail(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var email = raw.Trim().ToLowerInvariant();
        if (email.Length < 5 || email.Length > 254) return null;
        var at = email.IndexOf('@');
        if (at <= 0 || at != email.LastIndexOf('@')) return null;
        var domain = email[(at + 1)..];
        if (!domain.Contains('.') || domain.StartsWith('.') || domain.EndsWith('.')) return null;
        if (email.Contains(' ')) return null;
        return email;
    }
}
