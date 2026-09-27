using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only feed of published club events (idea "Événements du club").
// Only published events are exposed, ordered by start date. The projection is
// stable and shared by web and Flutter clients; internal flags are not leaked.
[ApiController]
[Route("api/events")]
public sealed class ClubEventsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEvents(CancellationToken ct)
    {
        var items = await db.ClubEvents.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.StartAt)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Description,
                x.StartAt,
                x.EndAt,
                x.Location
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetEvent(string slug, CancellationToken ct)
    {
        var ev = await db.ClubEvents.AsNoTracking()
            .Where(x => x.IsPublished && x.Slug == slug)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Description,
                x.StartAt,
                x.EndAt,
                x.Location
            })
            .FirstOrDefaultAsync(ct);

        return ev is null ? NotFound() : Ok(ev);
    }
}
