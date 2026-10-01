using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/matches")]
public sealed class MatchDetailsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var match = await db.Matches.AsNoTracking()
            .Where(x => x.Id == id && x.IsPublished)
            .SingleOrDefaultAsync(ct);

        if (match is null) return NotFound();
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Match", [match.Id], ["opponentname", "venue", "status"], language, ct);
        return Ok(new
        {
            match.Id, match.SeasonId, match.CompetitionId, match.TeamId,
            OpponentName = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "opponentname", match.OpponentName, language),
            match.KickoffAt,
            Venue = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "venue", match.Venue, language),
            match.IsHome, match.HomeScore, match.AwayScore,
            Status = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "status", match.Status, language)
        });
    }

    [HttpGet("{id:guid}/events")]
    public async Task<IActionResult> GetEvents(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct))
            return NotFound();

        var events = await db.MatchEvents.AsNoTracking()
            .Where(x => x.MatchId == id)
            .OrderBy(x => x.Minute)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("MatchEvent", events.Select(x => x.Id), ["type", "playername", "secondaryplayername", "team", "notes"], language, ct);
        return Ok(events.Select(x => new
        {
            x.Id, x.MatchId, x.Minute,
            Type = ContentTranslationService.ResolveFromMap(map, "MatchEvent", x.Id, "type", x.Type, language),
            PlayerName = ContentTranslationService.ResolveFromMap(map, "MatchEvent", x.Id, "playername", x.PlayerName, language),
            SecondaryPlayerName = ContentTranslationService.ResolveFromMap(map, "MatchEvent", x.Id, "secondaryplayername", x.SecondaryPlayerName, language),
            Team = ContentTranslationService.ResolveFromMap(map, "MatchEvent", x.Id, "team", x.Team, language),
            Notes = ContentTranslationService.ResolveFromMap(map, "MatchEvent", x.Id, "notes", x.Notes, language)
        }));
    }
}
