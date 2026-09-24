using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/matches")]
public sealed class MatchDetailsController(JsoDbContext db) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var match = await db.Matches.AsNoTracking()
            .Where(x => x.Id == id && x.IsPublished)
            .Select(x => new
            {
                x.Id,
                x.SeasonId,
                x.CompetitionId,
                x.TeamId,
                x.OpponentName,
                x.KickoffAt,
                x.Venue,
                x.IsHome,
                x.HomeScore,
                x.AwayScore,
                x.Status
            })
            .SingleOrDefaultAsync(ct);

        return match is null ? NotFound() : Ok(match);
    }

    [HttpGet("{id:guid}/events")]
    public async Task<IActionResult> GetEvents(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct))
            return NotFound();

        return Ok(await db.MatchEvents.AsNoTracking()
            .Where(x => x.MatchId == id)
            .OrderBy(x => x.Minute)
            .ThenBy(x => x.Id)
            .ToListAsync(ct));
    }
}
