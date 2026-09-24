using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/home")]
public sealed class HomeController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var club = await db.Clubs.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ShortName == "JSO", ct);

        if (club is null)
            return NotFound();

        var now = DateTimeOffset.UtcNow;

        var nextMatch = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt >= now)
            .OrderBy(x => x.KickoffAt)
            .FirstOrDefaultAsync(ct);

        var recentMatches = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt < now)
            .OrderByDescending(x => x.KickoffAt)
            .Take(3)
            .ToListAsync(ct);

        var news = await db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published")
            .OrderByDescending(x => x.PublishedAt)
            .Take(3)
            .ToListAsync(ct);

        return Ok(new
        {
            club,
            nextMatch,
            recentMatches,
            news
        });
    }
}
