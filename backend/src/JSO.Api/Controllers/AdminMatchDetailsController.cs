using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin/matches/{matchId:guid}")]
public sealed class AdminMatchDetailsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("lineup")]
    public async Task<IActionResult> GetLineup(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        var rows = await db.MatchLineups.AsNoTracking()
            .Where(x => x.MatchId == matchId)
            .Join(db.Players.AsNoTracking(), x => x.PlayerId, p => p.Id, (x, p) => new
            {
                x.Id, x.PlayerId, p.FirstName, p.LastName, p.ShirtNumber, PlayerPosition = p.Position, x.Role, x.PositionOrder, x.Position, x.IsCaptain, x.IsSubstitute
            })
            .OrderBy(x => x.IsSubstitute).ThenBy(x => x.PositionOrder).ThenBy(x => x.LastName)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPut("lineup")]
    public async Task<IActionResult> ReplaceLineup(Guid matchId, LineupRequest request, CancellationToken ct)
    {
        var match = await db.Matches.AsNoTracking().SingleOrDefaultAsync(x => x.Id == matchId, ct);
        if (match is null) return NotFound();

        var playerIds = request.Items.Select(x => x.PlayerId).Distinct().ToArray();
        var validIds = await db.Players.Where(x => x.TeamId == match.TeamId && playerIds.Contains(x.Id) && x.IsActive).Select(x => x.Id).ToListAsync(ct);
        if (validIds.Count != playerIds.Length) return BadRequest(new { message = "One or more players do not belong to the match team." });

        if (request.Items.Any(x => x.Role is not ("Starter" or "Substitute")))
            return BadRequest(new { message = "Role must be Starter or Substitute." });

        db.MatchLineups.RemoveRange(db.MatchLineups.Where(x => x.MatchId == matchId));
        db.MatchLineups.AddRange(request.Items.Select(x => new MatchLineup
        {
            MatchId = matchId,
            PlayerId = x.PlayerId,
            Role = x.Role,
            PositionOrder = x.PositionOrder,
            Position = x.Position?.Trim(),
            IsCaptain = x.IsCaptain,
            IsSubstitute = x.Role == "Substitute"
        }));
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchLineup", matchId.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { count = request.Items.Count }, ct);
        return Ok();
    }

    [HttpGet("officials")]
    public async Task<IActionResult> GetOfficials(Guid matchId, CancellationToken ct) =>
        Ok(await db.MatchOfficials.AsNoTracking().Where(x => x.MatchId == matchId).OrderBy(x => x.Role).ThenBy(x => x.Name).ToListAsync(ct));

    [HttpPut("officials")]
    public async Task<IActionResult> ReplaceOfficials(Guid matchId, OfficialsRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        if (request.Items.Any(x => string.IsNullOrWhiteSpace(x.Name) || string.IsNullOrWhiteSpace(x.Role)))
            return BadRequest(new { message = "Official name and role are required." });

        db.MatchOfficials.RemoveRange(db.MatchOfficials.Where(x => x.MatchId == matchId));
        db.MatchOfficials.AddRange(request.Items.Select(x => new MatchOfficial { MatchId = matchId, Name = x.Name.Trim(), Role = x.Role.Trim() }));
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchOfficials", matchId.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { count = request.Items.Count }, ct);
        return Ok();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(Guid matchId, CancellationToken ct) =>
        Ok(await db.MatchStats.AsNoTracking().Where(x => x.MatchId == matchId).OrderBy(x => x.Name).ToListAsync(ct));

    [HttpPut("stats")]
    public async Task<IActionResult> ReplaceStats(Guid matchId, StatsRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        if (request.Items.Any(x => string.IsNullOrWhiteSpace(x.Name)))
            return BadRequest(new { message = "Statistic name is required." });

        db.MatchStats.RemoveRange(db.MatchStats.Where(x => x.MatchId == matchId));
        db.MatchStats.AddRange(request.Items.Select(x => new MatchStat { MatchId = matchId, Name = x.Name.Trim(), HomeValue = x.HomeValue, AwayValue = x.AwayValue }));
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchStats", matchId.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { count = request.Items.Count }, ct);
        return Ok();
    }
}

public sealed record LineupRequest(List<LineupItem> Items);
public sealed record LineupItem(Guid PlayerId, string Role, int? PositionOrder, string? Position, bool IsCaptain);
public sealed record OfficialsRequest(List<OfficialItem> Items);
public sealed record OfficialItem(string Name, string Role);
public sealed record StatsRequest(List<StatItem> Items);
public sealed record StatItem(string Name, int? HomeValue, int? AwayValue);
