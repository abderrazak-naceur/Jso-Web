using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/teams")]
public sealed class TeamsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTeams(CancellationToken ct)
    {
        var teams = await db.Teams.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Category,
                x.IsActive,
                PlayersCount = db.Players.Count(p => p.TeamId == x.Id && p.IsActive)
            })
            .ToListAsync(ct);

        return Ok(teams);
    }

    [HttpGet("{id:guid}/players")]
    public async Task<IActionResult> GetPlayers(Guid id, CancellationToken ct)
    {
        if (!await db.Teams.AsNoTracking().AnyAsync(x => x.Id == id && x.IsActive, ct))
            return NotFound();

        var players = await db.Players.AsNoTracking()
            .Where(x => x.TeamId == id && x.IsActive)
            .OrderBy(x => x.ShirtNumber)
            .ThenBy(x => x.LastName)
            .Select(x => new
            {
                x.Id,
                x.TeamId,
                x.FirstName,
                x.LastName,
                x.ShirtNumber,
                x.Position,
                x.PhotoUrl
            })
            .ToListAsync(ct);

        return Ok(players);
    }
}
