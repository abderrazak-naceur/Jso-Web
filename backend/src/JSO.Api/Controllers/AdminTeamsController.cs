using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/teams")]
public sealed class AdminTeamsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTeams(CancellationToken ct) =>
        Ok(await db.Teams.AsNoTracking().OrderBy(x => x.Category).ThenBy(x => x.Name).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateTeam(TeamRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category))
            return BadRequest(new { message = "Name and category are required." });

        var team = new Team { Name = request.Name.Trim(), Category = request.Category.Trim(), IsActive = true };
        db.Teams.Add(team);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/teams/{team.Id}", team);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTeam(Guid id, TeamRequest request, CancellationToken ct)
    {
        var team = await db.Teams.FindAsync([id], ct);
        if (team is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category))
            return BadRequest(new { message = "Name and category are required." });

        team.Name = request.Name.Trim();
        team.Category = request.Category.Trim();
        team.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return Ok(team);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTeam(Guid id, CancellationToken ct)
    {
        var team = await db.Teams.FindAsync([id], ct);
        if (team is null) return NotFound();
        team.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("{teamId:guid}/players")]
    public async Task<IActionResult> GetPlayers(Guid teamId, CancellationToken ct) =>
        Ok(await db.Players.AsNoTracking().Where(x => x.TeamId == teamId).OrderBy(x => x.ShirtNumber).ToListAsync(ct));

    [HttpPost("{teamId:guid}/players")]
    public async Task<IActionResult> CreatePlayer(Guid teamId, PlayerRequest request, CancellationToken ct)
    {
        if (!await db.Teams.AnyAsync(x => x.Id == teamId, ct)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            return BadRequest(new { message = "First name and last name are required." });

        var player = new Player
        {
            TeamId = teamId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            ShirtNumber = request.ShirtNumber,
            Position = request.Position?.Trim(),
            PhotoUrl = request.PhotoUrl?.Trim(),
            IsActive = true
        };
        db.Players.Add(player);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/teams/{teamId}/players/{player.Id}", player);
    }

    [HttpPut("{teamId:guid}/players/{playerId:guid}")]
    public async Task<IActionResult> UpdatePlayer(Guid teamId, Guid playerId, PlayerRequest request, CancellationToken ct)
    {
        var player = await db.Players.SingleOrDefaultAsync(x => x.Id == playerId && x.TeamId == teamId, ct);
        if (player is null) return NotFound();

        player.FirstName = request.FirstName.Trim();
        player.LastName = request.LastName.Trim();
        player.ShirtNumber = request.ShirtNumber;
        player.Position = request.Position?.Trim();
        player.PhotoUrl = request.PhotoUrl?.Trim();
        player.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return Ok(player);
    }

    [HttpDelete("{teamId:guid}/players/{playerId:guid}")]
    public async Task<IActionResult> DeletePlayer(Guid teamId, Guid playerId, CancellationToken ct)
    {
        var player = await db.Players.SingleOrDefaultAsync(x => x.Id == playerId && x.TeamId == teamId, ct);
        if (player is null) return NotFound();
        player.IsActive = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record TeamRequest(string Name, string Category, bool IsActive = true);
public sealed record PlayerRequest(string FirstName, string LastName, int? ShirtNumber, string? Position, string? PhotoUrl, bool IsActive = true);
