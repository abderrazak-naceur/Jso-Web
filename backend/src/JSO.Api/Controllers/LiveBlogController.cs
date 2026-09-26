using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/matches")]
public sealed class LiveBlogController(JsoDbContext db) : ControllerBase
{
    // Public, read-only live blog feed for a published match. Designed for lightweight
    // polling by web/Flutter clients: pinned entries first, then most recent by CreatedAt.
    [HttpGet("{id:guid}/liveblog")]
    public async Task<IActionResult> GetLiveBlog(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct)) return NotFound();
        var entries = await db.LiveBlogEntries.AsNoTracking()
            .Where(x => x.MatchId == id)
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.MatchId,
                x.Minute,
                x.Kind,
                x.Body,
                x.CreatedAt,
                x.IsPinned
            })
            .ToListAsync(ct);
        return Ok(entries);
    }
}
