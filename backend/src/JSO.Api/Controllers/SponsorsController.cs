using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/sponsors")]
public sealed class SponsorsController(JsoDbContext db) : ControllerBase
{
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

        var sponsors = await query
            .OrderByDescending(x => x.Priority)
            .ThenBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.LogoUrl,
                x.WebsiteUrl,
                x.Tier,
                x.Placement
            })
            .ToListAsync(ct);

        return Ok(sponsors);
    }
}
