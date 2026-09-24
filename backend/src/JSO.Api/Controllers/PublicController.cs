using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class PublicController(JsoDbContext db) : ControllerBase
{
    [HttpGet("club")]
    public async Task<IActionResult> GetClub(CancellationToken ct)
    {
        var club = await db.Clubs.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ShortName == "JSO", ct);

        return club is null ? NotFound() : Ok(club);
    }

    [HttpGet("matches")]
    public async Task<IActionResult> GetMatches(CancellationToken ct)
    {
        var matches = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.KickoffAt)
            .Take(50)
            .ToListAsync(ct);

        return Ok(matches);
    }

    [HttpGet("news")]
    public async Task<IActionResult> GetNews(CancellationToken ct)
    {
        var articles = await db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published")
            .OrderByDescending(x => x.PublishedAt)
            .Take(20)
            .ToListAsync(ct);

        return Ok(articles);
    }
}
