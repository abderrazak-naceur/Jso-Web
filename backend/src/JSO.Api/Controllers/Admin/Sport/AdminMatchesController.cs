using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin/matches")]
public sealed class AdminMatchesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.Matches.AsNoTracking().OrderByDescending(x => x.KickoffAt).Take(100).ToListAsync(ct));

    [HttpGet("references")]
    public async Task<IActionResult> GetReferences(CancellationToken ct)
    {
        var seasons = await db.Seasons.AsNoTracking().OrderByDescending(x => x.IsActive).ThenByDescending(x => x.Name).ToListAsync(ct);
        var competitions = await db.Competitions.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
        var teams = await db.Teams.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync(ct);

        return Ok(new { seasons, competitions, teams });
    }

    [HttpPost]
    public async Task<IActionResult> Create(MatchRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.OpponentName)) return BadRequest(new { message = "Opponent is required." });
        if (!await db.Teams.AnyAsync(x => x.Id == request.TeamId, ct)) return BadRequest(new { message = "Team not found." });
        if (!await db.Seasons.AnyAsync(x => x.Id == request.SeasonId, ct)) return BadRequest(new { message = "Season not found." });
        if (!await db.Competitions.AnyAsync(x => x.Id == request.CompetitionId, ct)) return BadRequest(new { message = "Competition not found." });

        var match = new Match
        {
            SeasonId = request.SeasonId,
            CompetitionId = request.CompetitionId,
            TeamId = request.TeamId,
            OpponentName = request.OpponentName.Trim(),
            KickoffAt = request.KickoffAt,
            Venue = request.Venue?.Trim(),
            IsHome = request.IsHome,
            Status = request.Status?.Trim() ?? "Scheduled",
            HomeScore = request.HomeScore,
            AwayScore = request.AwayScore,
            IsPublished = request.IsPublished
        };
        db.Matches.Add(match);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Match", match.Id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Created($"/api/admin/matches/{match.Id}", match);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MatchRequest request, CancellationToken ct)
    {
        var match = await db.Matches.FindAsync([id], ct);
        if (match is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.OpponentName)) return BadRequest(new { message = "Opponent is required." });
        if (!await db.Teams.AnyAsync(x => x.Id == request.TeamId, ct)) return BadRequest(new { message = "Team not found." });
        if (!await db.Seasons.AnyAsync(x => x.Id == request.SeasonId, ct)) return BadRequest(new { message = "Season not found." });
        if (!await db.Competitions.AnyAsync(x => x.Id == request.CompetitionId, ct)) return BadRequest(new { message = "Competition not found." });

        match.OpponentName = request.OpponentName.Trim();
        match.KickoffAt = request.KickoffAt;
        match.Venue = request.Venue?.Trim();
        match.IsHome = request.IsHome;
        match.Status = request.Status?.Trim() ?? match.Status;
        match.HomeScore = request.HomeScore;
        match.AwayScore = request.AwayScore;
        match.IsPublished = request.IsPublished;
        match.SeasonId = request.SeasonId;
        match.CompetitionId = request.CompetitionId;
        match.TeamId = request.TeamId;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Match", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Ok(match);
    }

    [HttpGet("{id:guid}/events")]
    public async Task<IActionResult> GetEvents(Guid id, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == id, ct)) return NotFound();
        return Ok(await db.MatchEvents.AsNoTracking().Where(x => x.MatchId == id).OrderBy(x => x.Minute).ThenBy(x => x.Id).ToListAsync(ct));
    }

    [HttpPost("{id:guid}/events")]
    public async Task<IActionResult> AddEvent(Guid id, MatchEventRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == id, ct)) return NotFound();
        if (request.Minute < 0 || request.Minute > 200) return BadRequest(new { message = "Minute must be between 0 and 200." });
        if (string.IsNullOrWhiteSpace(request.Type)) return BadRequest(new { message = "Event type is required." });
        if (!TryNormalizeTeam(request.Team, out var team)) return BadRequest(new { message = "Team must be 'Home' or 'Away'." });

        var matchEvent = new MatchEvent
        {
            MatchId = id,
            Minute = request.Minute,
            Type = request.Type.Trim(),
            PlayerName = request.PlayerName?.Trim(),
            SecondaryPlayerName = request.SecondaryPlayerName?.Trim(),
            Team = team,
            Notes = request.Notes?.Trim()
        };
        db.MatchEvents.Add(matchEvent);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "MatchEvent", matchEvent.Id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { matchId = id }, ct);
        return Created($"/api/admin/matches/{id}/events/{matchEvent.Id}", matchEvent);
    }

    [HttpPut("{id:guid}/events/{eventId:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, Guid eventId, MatchEventRequest request, CancellationToken ct)
    {
        var matchEvent = await db.MatchEvents.SingleOrDefaultAsync(x => x.Id == eventId && x.MatchId == id, ct);
        if (matchEvent is null) return NotFound();
        if (request.Minute < 0 || request.Minute > 200) return BadRequest(new { message = "Minute must be between 0 and 200." });
        if (string.IsNullOrWhiteSpace(request.Type)) return BadRequest(new { message = "Event type is required." });
        if (!TryNormalizeTeam(request.Team, out var team)) return BadRequest(new { message = "Team must be 'Home' or 'Away'." });

        matchEvent.Minute = request.Minute;
        matchEvent.Type = request.Type.Trim();
        matchEvent.PlayerName = request.PlayerName?.Trim();
        matchEvent.SecondaryPlayerName = request.SecondaryPlayerName?.Trim();
        matchEvent.Team = team;
        matchEvent.Notes = request.Notes?.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchEvent", eventId.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { matchId = id }, ct);
        return Ok(matchEvent);
    }

    private static bool TryNormalizeTeam(string? value, out string? team)
    {
        if (string.IsNullOrWhiteSpace(value)) { team = null; return true; }
        var trimmed = value.Trim();
        if (string.Equals(trimmed, "Home", StringComparison.OrdinalIgnoreCase)) { team = "Home"; return true; }
        if (string.Equals(trimmed, "Away", StringComparison.OrdinalIgnoreCase)) { team = "Away"; return true; }
        team = null; return false;
    }

    [HttpDelete("{id:guid}/events/{eventId:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, Guid eventId, CancellationToken ct)
    {
        var matchEvent = await db.MatchEvents.SingleOrDefaultAsync(x => x.Id == eventId && x.MatchId == id, ct);
        if (matchEvent is null) return NotFound();
        db.MatchEvents.Remove(matchEvent);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MatchEvent", eventId.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { matchId = id }, ct);
        return NoContent();
    }
}

public sealed record MatchRequest(Guid SeasonId, Guid CompetitionId, Guid TeamId, string OpponentName, DateTimeOffset KickoffAt, string? Venue, bool IsHome, int? HomeScore, int? AwayScore, string? Status, bool IsPublished);
public sealed record MatchEventRequest(int Minute, string Type, string? PlayerName, string? SecondaryPlayerName, string? Team, string? Notes);
