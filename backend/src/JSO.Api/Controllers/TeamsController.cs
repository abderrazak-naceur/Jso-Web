using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/teams")]
public sealed class TeamsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTeams(CancellationToken ct)
    {
        var entities = await db.Teams.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Team", entities.Select(x => x.Id), ["name", "category"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Name = ContentTranslationService.ResolveFromMap(map, "Team", x.Id, "name", x.Name, language),
            Category = ContentTranslationService.ResolveFromMap(map, "Team", x.Id, "category", x.Category, language),
            x.IsActive,
            PlayersCount = db.Players.Count(p => p.TeamId == x.Id && p.IsActive)
        }));
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
