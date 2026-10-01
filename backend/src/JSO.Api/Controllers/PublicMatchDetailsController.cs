using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/matches")]
public sealed class PublicMatchDetailsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet("{id:guid}/lineup")]
    public async Task<IActionResult> GetLineup(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == id && x.IsPublished, ct)) return NotFound();
        return Ok(await db.MatchLineups.AsNoTracking()
            .Where(x => x.MatchId == id)
            .Join(db.Players.AsNoTracking(), x => x.PlayerId, p => p.Id, (x,p) => new
            {
                x.Id, x.PlayerId, p.FirstName, p.LastName, p.ShirtNumber, PlayerPosition = p.Position, x.Role, x.PositionOrder, x.Position, x.IsCaptain, x.IsSubstitute
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

    // Match reminder enriched with the forecast weather (idea G22).
    //
    // Returns the pre-match reminder data (opponent, kickoff, venue, home/away)
    // plus an OPTIONAL "weather" block with the forecast for the kickoff hour
    // when the match is in the future and within the provider horizon.
    //
    // Resilience: the weather lookup can never break this endpoint. Any
    // provider failure, timeout or closed network (as may be the case on the
    // production Oracle VM) simply yields weather=null while the reminder is
    // still returned. The provider used is Open-Meteo (free, keyless, no secret).
    //
    // TODO(G22): actually delivering the reminder (email / push notification)
    // is out of scope for this iteration; this endpoint only exposes the data.
    [HttpGet("{id:guid}/reminder")]
    public async Task<IActionResult> GetReminder(Guid id, [FromServices] WeatherService weather, CancellationToken ct)
    {
        var match = await db.Matches.AsNoTracking()
            .Where(x => x.Id == id && x.IsPublished)
            .Select(x => new { x.Id, x.OpponentName, x.KickoffAt, x.Venue, x.IsHome, x.Status })
            .FirstOrDefaultAsync(ct);

        if (match is null) return NotFound();

        var forecast = await weather.TryGetForecastAsync(match.KickoffAt, ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Match", [match.Id], ["opponentname", "venue", "status"], language, ct);

        return Ok(new
        {
            match.Id,
            OpponentName = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "opponentname", match.OpponentName, language),
            match.KickoffAt,
            Venue = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "venue", match.Venue, language),
            match.IsHome,
            Status = ContentTranslationService.ResolveFromMap(map, "Match", match.Id, "status", match.Status, language),
            Weather = forecast
        });
    }
}
