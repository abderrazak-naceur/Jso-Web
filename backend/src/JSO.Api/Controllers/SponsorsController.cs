using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/sponsors")]
public sealed class SponsorsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    // Coarse, allow-listed activation channels for idea B5. The public endpoint
    // maps the optional ?c= query to one of these buckets (defaulting to null)
    // so that persisted values stay aggregatable and never carry free-form or
    // personal data.
    private static readonly string[] ActivationChannels = ["Stadium", "Program"];

    [HttpGet]
    public async Task<IActionResult> GetSponsors([FromQuery] string? placement, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var query = db.Sponsors.AsNoTracking()
            .Where(x => x.IsActive)
            .Where(x => x.StartDate == null || x.StartDate <= now)
            .Where(x => x.EndDate == null || x.EndDate >= now);

        if (!string.IsNullOrWhiteSpace(placement))
            query = query.Where(x => x.Placement == placement);

        var entities = await query
            .OrderByDescending(x => x.Priority)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);
        var language = ContentTranslationService.GetRequestLanguage(Request);
        var map = await translations.LoadAsync("Sponsor", entities.Select(x => x.Id), ["name", "tier", "placement"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Name = ContentTranslationService.ResolveFromMap(map, "Sponsor", x.Id, "name", x.Name, language),
            x.LogoUrl, x.WebsiteUrl,
            Tier = ContentTranslationService.ResolveFromMap(map, "Sponsor", x.Id, "tier", x.Tier, language),
            Placement = ContentTranslationService.ResolveFromMap(map, "Sponsor", x.Id, "placement", x.Placement, language),
            x.BannerImageUrl
        }));
    }

    // Public tracked landing for idea B5 (sponsor QR activation). A physical QR
    // at the stadium or on the matchday programme encodes this URL. When
    // scanned we record ONE anonymous SponsorActivation (sponsor + coarse
    // channel + timestamp) and redirect to the sponsor website. Privacy by
    // design: no IP, no user id, no user agent, no cookie, no PII is stored, so
    // the data is only ever aggregatable, never attributable to an individual.
    [HttpGet("activation/{slug}")]
    public async Task<IActionResult> Activate(string slug, [FromQuery(Name = "c")] string? channel, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(slug)) return NotFound();

        var now = DateTimeOffset.UtcNow;
        var sponsor = await db.Sponsors.AsNoTracking()
            .Where(x => x.ActivationSlug == slug)
            .Where(x => x.IsActive)
            .Where(x => x.StartDate == null || x.StartDate <= now)
            .Where(x => x.EndDate == null || x.EndDate >= now)
            .Select(x => new { x.Id, x.Name, x.WebsiteUrl })
            .FirstOrDefaultAsync(ct);

        if (sponsor is null) return NotFound();

        // Normalise the optional channel to an allow-listed bucket (case-insensitive)
        // or drop it entirely. This keeps the counter anonymous and aggregatable.
        var normalizedChannel = ActivationChannels
            .FirstOrDefault(c => string.Equals(c, channel?.Trim(), StringComparison.OrdinalIgnoreCase));

        db.SponsorActivations.Add(new SponsorActivation
        {
            SponsorId = sponsor.Id,
            Channel = normalizedChannel,
            ScannedAt = now
        });
        await db.SaveChangesAsync(ct);

        // Redirect only to a validated absolute http(s) URL to avoid open-redirect
        // and unsafe schemes. If the sponsor has no valid website, return minimal
        // non-personal data instead so the scan is still counted.
        if (!string.IsNullOrWhiteSpace(sponsor.WebsiteUrl)
            && Uri.TryCreate(sponsor.WebsiteUrl, UriKind.Absolute, out var target)
            && (target.Scheme == Uri.UriSchemeHttp || target.Scheme == Uri.UriSchemeHttps))
        {
            return Redirect(target.ToString());
        }

        return Ok(new { sponsor.Name });
    }
}
