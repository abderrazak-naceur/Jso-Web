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

    // Published news feed. Without paging parameters it keeps its original
    // shape (a plain array of the 20 most recent articles) so existing callers
    // — the home page — are unaffected. When `page` is supplied it returns a
    // paged envelope { items, page, pageSize, total } for the "all articles"
    // listing page. pageSize is clamped to a sane maximum.
    [HttpGet("news")]
    public async Task<IActionResult> GetNews(int? page, int? pageSize, CancellationToken ct)
    {
        var query = db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published")
            .OrderByDescending(x => x.PublishedAt);

        if (page is null)
        {
            var recent = await query.Take(20).ToListAsync(ct);
            return Ok(recent);
        }

        var currentPage = page.Value < 1 ? 1 : page.Value;
        var size = pageSize is null or < 1 ? 9 : Math.Min(pageSize.Value, 48);
        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((currentPage - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        return Ok(new { items, page = currentPage, pageSize = size, total });
    }
}
