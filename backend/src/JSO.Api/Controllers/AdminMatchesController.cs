using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin/matches")]
public sealed class AdminMatchesController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.Matches.AsNoTracking().OrderByDescending(x => x.KickoffAt).Take(100).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(MatchRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.OpponentName)) return BadRequest(new { message = "Opponent is required." });
        if (!await db.Teams.AnyAsync(x => x.Id == request.TeamId, ct)) return BadRequest(new { message = "Team not found." });

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
        return Created($"/api/admin/matches/{match.Id}", match);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MatchRequest request, CancellationToken ct)
    {
        var match = await db.Matches.FindAsync([id], ct);
        if (match is null) return NotFound();

        match.OpponentName = request.OpponentName.Trim();
        match.KickoffAt = request.KickoffAt;
        match.Venue = request.Venue?.Trim();
        match.IsHome = request.IsHome;
        match.Status = request.Status?.Trim() ?? match.Status;
        match.HomeScore = request.HomeScore;
        match.AwayScore = request.AwayScore;
        match.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        return Ok(match);
    }

    [HttpPost("{id:guid}/events")]
    public async Task<IActionResult> AddEvent(Guid id, MatchEventRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == id, ct)) return NotFound();
        var matchEvent = new MatchEvent
        {
            MatchId = id,
            Minute = request.Minute,
            Type = request.Type.Trim(),
            PlayerName = request.PlayerName?.Trim(),
            Notes = request.Notes?.Trim()
        };
        db.MatchEvents.Add(matchEvent);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/matches/{id}/events/{matchEvent.Id}", matchEvent);
    }
}

public sealed record MatchRequest(Guid SeasonId, Guid CompetitionId, Guid TeamId, string OpponentName, DateTimeOffset KickoffAt, string? Venue, bool IsHome, int? HomeScore, int? AwayScore, string? Status, bool IsPublished);
public sealed record MatchEventRequest(int Minute, string Type, string? PlayerName, string? Notes);
