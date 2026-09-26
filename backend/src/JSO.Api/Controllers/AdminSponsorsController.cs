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
            Priority = request.Priority
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
    int Priority = 0);
