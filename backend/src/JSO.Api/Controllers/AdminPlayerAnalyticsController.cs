using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Read-only analytics DERIVED from existing data (MatchLineup + MatchEvent).
// No new data tables: appearances come from lineups (by PlayerId), while
// goals/cards come from match events (which reference the player by name).
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin")]
public sealed class AdminPlayerAnalyticsController(JsoDbContext db) : ControllerBase
{
    private static bool IsGoal(string type) => type.Contains("goal", StringComparison.OrdinalIgnoreCase)
        || type.Contains("but", StringComparison.OrdinalIgnoreCase);
    private static bool IsYellow(string type) => type.Contains("yellow", StringComparison.OrdinalIgnoreCase)
        || type.Contains("jaune", StringComparison.OrdinalIgnoreCase);
    private static bool IsRed(string type) => type.Contains("red", StringComparison.OrdinalIgnoreCase)
        || type.Contains("rouge", StringComparison.OrdinalIgnoreCase);

    [HttpGet("players/{id:guid}/analytics")]
    public async Task<IActionResult> PlayerAnalytics(Guid id, [FromQuery] Guid? seasonId, CancellationToken ct)
    {
        var player = await db.Players.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (player is null) return NotFound();

        var fullName = (player.FirstName + " " + player.LastName).Trim();

        // Restrict to a season's matches when requested.
        var matchIds = seasonId is null
            ? null
            : await db.Matches.AsNoTracking().Where(x => x.SeasonId == seasonId).Select(x => x.Id).ToListAsync(ct);

        var lineups = db.MatchLineups.AsNoTracking().Where(x => x.PlayerId == id);
        if (matchIds is not null) lineups = lineups.Where(x => matchIds.Contains(x.MatchId));
        var lineupList = await lineups.ToListAsync(ct);

        var appearances = lineupList.Count;
        var starts = lineupList.Count(x => !x.IsSubstitute);

        var events = db.MatchEvents.AsNoTracking().Where(x => x.PlayerName == fullName);
        if (matchIds is not null) events = events.Where(x => matchIds.Contains(x.MatchId));
        var eventList = await events.ToListAsync(ct);

        var goals = eventList.Count(x => IsGoal(x.Type));
        var yellow = eventList.Count(x => IsYellow(x.Type));
        var red = eventList.Count(x => IsRed(x.Type));

        return Ok(new
        {
            player = new { player.Id, player.FirstName, player.LastName, player.ShirtNumber, player.Position },
            seasonId,
            appearances,
            starts,
            substituteAppearances = appearances - starts,
            goals,
            yellowCards = yellow,
            redCards = red,
            goalsPerAppearance = appearances > 0 ? Math.Round((double)goals / appearances, 2) : 0
        });
    }

    [HttpGet("teams/{id:guid}/analytics")]
    public async Task<IActionResult> TeamAnalytics(Guid id, [FromQuery] Guid? seasonId, CancellationToken ct)
    {
        if (!await db.Teams.AnyAsync(x => x.Id == id, ct)) return NotFound();

        var players = await db.Players.AsNoTracking()
            .Where(x => x.TeamId == id)
            .ToListAsync(ct);

        var matchIds = seasonId is null
            ? null
            : await db.Matches.AsNoTracking().Where(x => x.SeasonId == seasonId).Select(x => x.Id).ToListAsync(ct);

        var lineupsQuery = db.MatchLineups.AsNoTracking();
        if (matchIds is not null) lineupsQuery = lineupsQuery.Where(x => matchIds.Contains(x.MatchId));
        var lineups = await lineupsQuery.ToListAsync(ct);

        var eventsQuery = db.MatchEvents.AsNoTracking();
        if (matchIds is not null) eventsQuery = eventsQuery.Where(x => matchIds.Contains(x.MatchId));
        var events = await eventsQuery.ToListAsync(ct);

        var rows = players.Select(p =>
        {
            var fullName = (p.FirstName + " " + p.LastName).Trim();
            var apps = lineups.Count(l => l.PlayerId == p.Id);
            var playerEvents = events.Where(e => e.PlayerName == fullName).ToList();
            return new
            {
                p.Id,
                name = fullName,
                p.ShirtNumber,
                appearances = apps,
                goals = playerEvents.Count(e => IsGoal(e.Type)),
                yellowCards = playerEvents.Count(e => IsYellow(e.Type)),
                redCards = playerEvents.Count(e => IsRed(e.Type))
            };
        })
        .OrderByDescending(x => x.goals)
        .ThenByDescending(x => x.appearances)
        .ToList();

        return Ok(new { teamId = id, seasonId, players = rows });
    }
}
