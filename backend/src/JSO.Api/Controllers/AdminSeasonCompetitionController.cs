using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin")]
public sealed class AdminSeasonCompetitionController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("seasons")]
    public async Task<IActionResult> GetSeasons(CancellationToken ct) =>
        Ok(await db.Seasons.AsNoTracking()
            .OrderByDescending(x => x.IsActive).ThenBy(x => x.Name)
            .ToListAsync(ct));

    [HttpGet("seasons/{id:guid}")]
    public async Task<IActionResult> GetSeason(Guid id, CancellationToken ct)
    {
        var season = await db.Seasons.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        return season is null ? NotFound() : Ok(season);
    }

    [HttpPost("seasons")]
    public async Task<IActionResult> CreateSeason(SeasonRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
            return BadRequest(new { message = "Season name is required and must be at most 120 characters." });

        var name = request.Name.Trim();
        if (await db.Seasons.AnyAsync(x => x.Name.ToLower() == name.ToLower(), ct))
            return Conflict(new { message = "A season with this name already exists." });

        var season = new Season { Name = name, IsActive = request.IsActive };
        db.Seasons.Add(season);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Season", season.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Created($"/api/admin/seasons/{season.Id}", season);
    }

    [HttpGet("competitions")]
    public async Task<IActionResult> GetCompetitions(CancellationToken ct) =>
        Ok(await db.Competitions.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct));

    [HttpGet("competitions/{id:guid}")]
    public async Task<IActionResult> GetCompetition(Guid id, CancellationToken ct)
    {
        var competition = await db.Competitions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        return competition is null ? NotFound() : Ok(competition);
    }

    [HttpPost("competitions")]
    public async Task<IActionResult> CreateCompetition(CompetitionRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 120)
            return BadRequest(new { message = "Competition name is required and must be at most 120 characters." });
        if (request.Country?.Length > 80)
            return BadRequest(new { message = "Country must be at most 80 characters." });

        var name = request.Name.Trim();
        if (await db.Competitions.AnyAsync(x => x.Name.ToLower() == name.ToLower(), ct))
            return Conflict(new { message = "A competition with this name already exists." });

        var competition = new Competition
        {
            Name = name,
            Country = string.IsNullOrWhiteSpace(request.Country) ? null : request.Country.Trim()
        };
        db.Competitions.Add(competition);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Competition", competition.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Created($"/api/admin/competitions/{competition.Id}", competition);
    }
}

public sealed record SeasonRequest(string Name, bool IsActive = false);
public sealed record CompetitionRequest(string Name, string? Country);
