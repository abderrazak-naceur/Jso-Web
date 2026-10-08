using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Newsletter administration (idea A4). Restricted to Editor / CommunityManager.
// This iteration never sends email: it lists subscribers with their status and can build a
// JSON digest preview from existing news/matches. Sending via a transactional provider is a
// documented TODO (see NewsletterController).
[ApiController]
[Authorize(Roles = "Editor,CommunityManager")]
[Route("api/admin/newsletter")]
public sealed class AdminNewsletterController(JsoDbContext db) : ControllerBase
{
    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions(CancellationToken ct)
    {
        var subscriptions = await db.NewsletterSubscriptions.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.FanUserId,
                x.ConfirmedAt,
                x.Unsubscribed,
                Confirmed = x.ConfirmedAt != null,
                Status = x.Unsubscribed
                    ? "Unsubscribed"
                    : (x.ConfirmedAt != null ? "Confirmed" : "Pending"),
                x.CreatedAt
            })
            .ToListAsync(ct);

        var counts = new
        {
            total = subscriptions.Count,
            confirmed = subscriptions.Count(x => x.Confirmed && !x.Unsubscribed),
            pending = subscriptions.Count(x => !x.Confirmed && !x.Unsubscribed),
            unsubscribed = subscriptions.Count(x => x.Unsubscribed)
        };

        return Ok(new { counts, subscriptions });
    }

    // Builds a preview of the weekly digest from existing published data. Read-only: this does
    // NOT send anything. It reuses the same data the public home feed relies on.
    [HttpGet("digest-preview")]
    public async Task<IActionResult> GetDigestPreview(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        var upcomingMatches = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt >= now)
            .OrderBy(x => x.KickoffAt)
            .Take(5)
            .Select(x => new { x.Id, x.OpponentName, x.KickoffAt, x.Venue, x.IsHome })
            .ToListAsync(ct);

        var recentResults = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt < now)
            .OrderByDescending(x => x.KickoffAt)
            .Take(5)
            .Select(x => new { x.Id, x.OpponentName, x.KickoffAt, x.HomeScore, x.AwayScore, x.IsHome, x.Status })
            .ToListAsync(ct);

        var latestNews = await db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published")
            .OrderByDescending(x => x.PublishedAt)
            .Take(5)
            .Select(x => new { x.Id, x.Title, x.Slug, x.Excerpt, x.PublishedAt })
            .ToListAsync(ct);

        var activeRecipients = await db.NewsletterSubscriptions.AsNoTracking()
            .CountAsync(x => x.ConfirmedAt != null && !x.Unsubscribed, ct);

        return Ok(new
        {
            generatedAt = now,
            activeRecipients,
            upcomingMatches,
            recentResults,
            latestNews,
            // Reminder for the frontend/ops: nothing is sent yet.
            note = "Aperçu uniquement. L'envoi d'e-mails nécessite un fournisseur transactionnel (TODO)."
        });
    }
}
