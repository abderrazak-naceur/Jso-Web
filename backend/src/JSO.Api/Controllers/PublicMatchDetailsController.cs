using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/matches")]
public sealed class PublicMatchDetailsController(JsoDbContext db) : ControllerBase
{
    [HttpGet("{id:guid}/lineup")]
    public async Task<IActionResult> GetLineup(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct)) return NotFound();
        return Ok(await db.MatchLineups.AsNoTracking()
            .Where(x => x.MatchId == id)
            .Join(db.Players.AsNoTracking(), x => x.PlayerId, p => p.Id, (x,p) => new
            {
                x.Id, x.PlayerId, p.FirstName, p.LastName, p.ShirtNumber, p.Position, x.Role, x.PositionOrder, x.Position, x.IsCaptain
            })
            .OrderBy(x => x.IsSubstitute).ThenBy(x => x.PositionOrder).ThenBy(x => x.LastName)
            .ToListAsync(ct));
    }

    [HttpGet("{id:guid}/officials")]
    public async Task<IActionResult> GetOfficials(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct)) return NotFound();
        return Ok(await db.MatchOfficials.AsNoTracking().Where(x => x.MatchId == id).OrderBy(x => x.Role).ThenBy(x => x.Name).ToListAsync(ct));
    }

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetStats(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct)) return NotFound();
        return Ok(await db.MatchStats.AsNoTracking().Where(x => x.MatchId == id).OrderBy(x => x.Name).ToListAsync(ct));
    }
}
