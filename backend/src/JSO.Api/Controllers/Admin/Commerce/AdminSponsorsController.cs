using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/sponsors")]
public sealed class AdminSponsorsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] Tiers = ["Title", "Gold", "Silver", "Partner"];
    private static readonly string[] Placements = ["Home", "Footer", "Matchday"];

    [HttpGet]
    public async Task<IActionResult> GetSponsors(CancellationToken ct) =>
        Ok(await db.Sponsors.AsNoTracking()
            .OrderBy(x => x.Placement).ThenByDescending(x => x.Priority).ThenBy(x => x.Name)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateSponsor(SponsorRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var sponsor = new Sponsor
        {
            Name = request.Name.Trim(),
            LogoUrl = request.LogoUrl?.Trim(),
            WebsiteUrl = request.WebsiteUrl?.Trim(),
            Tier = request.Tier.Trim(),
            Placement = request.Placement.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            Priority = request.Priority,
            BannerImageUrl = request.BannerImageUrl?.Trim()
        };
        db.Sponsors.Add(sponsor);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Sponsor", sponsor.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { sponsor.Tier, sponsor.Placement }, ct);
        return Created($"/api/admin/sponsors/{sponsor.Id}", sponsor);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSponsor(Guid id, SponsorRequest request, CancellationToken ct)
    {
        var sponsor = await db.Sponsors.FindAsync([id], ct);
        if (sponsor is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        sponsor.Name = request.Name.Trim();
        sponsor.LogoUrl = request.LogoUrl?.Trim();
        sponsor.WebsiteUrl = request.WebsiteUrl?.Trim();
        sponsor.Tier = request.Tier.Trim();
        sponsor.Placement = request.Placement.Trim();
        sponsor.StartDate = request.StartDate;
        sponsor.EndDate = request.EndDate;
        sponsor.IsActive = request.IsActive;
        sponsor.Priority = request.Priority;
        sponsor.BannerImageUrl = request.BannerImageUrl?.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Sponsor", sponsor.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { sponsor.Tier, sponsor.Placement }, ct);
        return Ok(sponsor);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSponsor(Guid id, CancellationToken ct)
    {
        var sponsor = await db.Sponsors.FindAsync([id], ct);
        if (sponsor is null) return NotFound();
        db.Sponsors.Remove(sponsor);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "Sponsor", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    // Generate (or regenerate) the sponsor's ActivationSlug for idea B5. The slug
    // is a short, URL-safe, non-guessable token embedded in the physical QR code.
    // Uniqueness is enforced by a filtered unique index; on the astronomically
    // rare collision we retry. The write is audited (no PII beyond the actor).
    [HttpPost("{id:guid}/activation-slug")]
    public async Task<IActionResult> GenerateActivationSlug(Guid id, CancellationToken ct)
    {
        var sponsor = await db.Sponsors.FindAsync([id], ct);
        if (sponsor is null) return NotFound();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var candidate = NewSlug();
            var taken = await db.Sponsors.AsNoTracking()
                .AnyAsync(x => x.ActivationSlug == candidate && x.Id != id, ct);
            if (taken) continue;

            sponsor.ActivationSlug = candidate;
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("GENERATE_ACTIVATION_SLUG", "Sponsor", sponsor.Id.ToString(),
                User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(), new { sponsor.ActivationSlug }, ct);
            return Ok(new { sponsor.Id, sponsor.ActivationSlug });
        }

        return Conflict(new { message = "Could not generate a unique activation slug, please retry." });
    }

    // Anonymous, aggregated activation report for idea B5. Returns the total
    // scan count, a per-day breakdown and a per-channel breakdown. No individual
    // scan rows or personal data are exposed because none are stored.
    [HttpGet("{id:guid}/activations")]
    public async Task<IActionResult> GetActivations(Guid id, CancellationToken ct)
    {
        var sponsor = await db.Sponsors.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new { x.Id, x.Name, x.ActivationSlug })
            .FirstOrDefaultAsync(ct);
        if (sponsor is null) return NotFound();

        var scans = db.SponsorActivations.AsNoTracking().Where(x => x.SponsorId == id);

        var total = await scans.CountAsync(ct);

        var byDay = await scans
            .GroupBy(x => x.ScannedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync(ct);

        var byChannel = await scans
            .GroupBy(x => x.Channel)
            .Select(g => new { Channel = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync(ct);

        return Ok(new
        {
            sponsor.Id,
            sponsor.Name,
            sponsor.ActivationSlug,
            total,
            byDay = byDay.Select(x => new { date = x.Date.ToString("yyyy-MM-dd"), count = x.Count }),
            byChannel = byChannel.Select(x => new { channel = x.Channel ?? "Inconnu", count = x.Count })
        });
    }

    // URL-safe, non-guessable slug (~12 base64url chars) for the physical QR code.
    private static string NewSlug() =>
        Convert.ToBase64String(Guid.NewGuid().ToByteArray()[..9])
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string? Validate(SponsorRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) return "Name is required.";
        if (!Tiers.Contains(r.Tier)) return $"Tier must be one of: {string.Join(", ", Tiers)}.";
        if (!Placements.Contains(r.Placement)) return $"Placement must be one of: {string.Join(", ", Placements)}.";
        if (r.StartDate is not null && r.EndDate is not null && r.EndDate < r.StartDate)
            return "EndDate must be on or after StartDate.";
        return null;
    }
}

public sealed record SponsorRequest(
    string Name,
    string? LogoUrl,
    string? WebsiteUrl,
    string Tier,
    string Placement,
    DateTimeOffset? StartDate,
    DateTimeOffset? EndDate,
    bool IsActive = true,
    int Priority = 0,
    string? BannerImageUrl = null);
