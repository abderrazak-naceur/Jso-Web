using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Player injury & availability register (idea C8).
// Health data is a special category under GDPR: every route requires the
// MatchManager or ClubAdmin role, every write is audited and the data is
// minimised (no clinical detail is required, Notes stays optional). There is
// no public endpoint for this data.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/players/{playerId:guid}/injuries")]
public sealed class AdminPlayerInjuriesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] Statuses = ["Active", "Recovering", "Fit"];

    [HttpGet]
    public async Task<IActionResult> GetInjuries(Guid playerId, CancellationToken ct)
    {
        if (!await db.Players.AnyAsync(x => x.Id == playerId, ct)) return NotFound();
        var rows = await db.PlayerInjuries.AsNoTracking()
            .Where(x => x.PlayerId == playerId)
            .OrderByDescending(x => x.StartDate).ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateInjury(Guid playerId, InjuryRequest request, CancellationToken ct)
    {
        if (!await db.Players.AnyAsync(x => x.Id == playerId, ct))
            return BadRequest(new { message = "Player does not exist." });

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var injury = new PlayerInjury
        {
            PlayerId = playerId,
            Type = request.Type.Trim(),
            StartDate = request.StartDate,
            ExpectedReturn = request.ExpectedReturn,
            Status = request.Status.Trim(),
            // Minimizzazione GDPR: nessun dettaglio clinico richiesto, note libere ma opzionali.
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
        };
        db.PlayerInjuries.Add(injury);
        await db.SaveChangesAsync(ct);
        // Audit senza dati sanitari: solo tipo e stato, mai le note cliniche.
        await audit.LogAsync("CREATE", "PlayerInjury", injury.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { injury.PlayerId, injury.Type, injury.Status }, ct);
        return Created($"/api/admin/players/{playerId}/injuries/{injury.Id}", injury);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateInjury(Guid playerId, Guid id, InjuryRequest request, CancellationToken ct)
    {
        var injury = await db.PlayerInjuries.FirstOrDefaultAsync(x => x.Id == id && x.PlayerId == playerId, ct);
        if (injury is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        injury.Type = request.Type.Trim();
        injury.StartDate = request.StartDate;
        injury.ExpectedReturn = request.ExpectedReturn;
        injury.Status = request.Status.Trim();
        injury.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "PlayerInjury", injury.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { injury.PlayerId, injury.Type, injury.Status }, ct);
        return Ok(injury);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteInjury(Guid playerId, Guid id, CancellationToken ct)
    {
        var injury = await db.PlayerInjuries.FirstOrDefaultAsync(x => x.Id == id && x.PlayerId == playerId, ct);
        if (injury is null) return NotFound();
        db.PlayerInjuries.Remove(injury);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "PlayerInjury", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { playerId }, ct);
        return NoContent();
    }

    private static string? Validate(InjuryRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Type)) return "Type is required.";
        if (r.StartDate == default) return "Start date is required.";
        if (!Statuses.Contains(r.Status)) return $"Status must be one of: {string.Join(", ", Statuses)}.";
        if (r.ExpectedReturn is { } ret && ret < r.StartDate)
            return "Expected return cannot be earlier than the start date.";
        return null;
    }
}

// Admin-only availability summary for a whole team, to support lineup choices.
// Same role restriction as above: no health data is ever public.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/teams/{teamId:guid}/availability")]
public sealed class AdminTeamAvailabilityController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAvailability(Guid teamId, CancellationToken ct)
    {
        if (!await db.Teams.AnyAsync(x => x.Id == teamId, ct)) return NotFound();

        var players = await db.Players.AsNoTracking()
            .Where(x => x.TeamId == teamId)
            .OrderBy(x => x.ShirtNumber)
            .Select(p => new { p.Id, p.FirstName, p.LastName, p.ShirtNumber, p.Position })
            .ToListAsync(ct);

        var playerIds = players.Select(p => p.Id).ToList();

        // Latest non-fit injury per player determines the current availability.
        var activeInjuries = await db.PlayerInjuries.AsNoTracking()
            .Where(x => playerIds.Contains(x.PlayerId) && x.Status != "Fit")
            .OrderByDescending(x => x.StartDate)
            .ToListAsync(ct);

        var byPlayer = activeInjuries
            .GroupBy(x => x.PlayerId)
            .ToDictionary(g => g.Key, g => g.First());

        var rows = players.Select(p =>
        {
            byPlayer.TryGetValue(p.Id, out var injury);
            return new
            {
                p.Id,
                p.FirstName,
                p.LastName,
                p.ShirtNumber,
                p.Position,
                IsAvailable = injury is null,
                CurrentStatus = injury?.Status ?? "Fit",
                CurrentType = injury?.Type,
                ExpectedReturn = injury?.ExpectedReturn
            };
        });

        return Ok(rows);
    }
}

public sealed record InjuryRequest(
    string Type,
    DateOnly StartDate,
    DateOnly? ExpectedReturn,
    string Status,
    string? Notes);
