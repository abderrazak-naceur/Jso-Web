using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;
using System.Text;
using System.Text.Json;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin/matches")]
public sealed class AdminMatchesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // Admin match list. The projection keeps every Match field the admin UI
    // already reads and additionally returns per-match ticket-type counts so
    // the billetterie screen can show, across the whole list, which matches
    // already have (active) ticket types — without N extra requests.
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.Matches.AsNoTracking()
            .OrderByDescending(x => x.KickoffAt)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.SeasonId,
                x.CompetitionId,
                x.TeamId,
                x.OpponentName,
                x.OpponentLogoUrl,
                x.TicketArtworkUrl,
                x.KickoffAt,
                x.Venue,
                x.IsHome,
                x.HomeScore,
                x.AwayScore,
                x.Status,
                x.IsPublished,
                HasTicketDesign = x.TicketDesignJson != null,
                TicketTypeCount = db.TicketTypes.Count(t => t.MatchId == x.Id),
                ActiveTicketTypeCount = db.TicketTypes.Count(t => t.MatchId == x.Id && t.IsActive)
            })
            .ToListAsync(ct));

    [HttpGet("references")]
    public async Task<IActionResult> GetReferences(CancellationToken ct)
    {
        var seasons = await db.Seasons.AsNoTracking().OrderByDescending(x => x.IsActive).ThenByDescending(x => x.Name).ToListAsync(ct);
        var competitions = await db.Competitions.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
        var teams = await db.Teams.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync(ct);

        return Ok(new { seasons, competitions, teams });
    }

    // Editable ticket-design document. It is private admin data and deliberately
    // excluded from public match DTOs and the admin list projection.
    [HttpGet("{id:guid}/ticket-design")]
    public async Task<IActionResult> GetTicketDesign(Guid id, CancellationToken ct)
    {
        var match = await db.Matches.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new { x.Id, x.TicketDesignJson, x.TicketArtworkUrl })
            .SingleOrDefaultAsync(ct);
        if (match is null) return NotFound();

        JsonElement? document = null;
        if (!string.IsNullOrWhiteSpace(match.TicketDesignJson))
        {
            try
            {
                using var parsed = JsonDocument.Parse(match.TicketDesignJson);
                document = parsed.RootElement.Clone();
            }
            catch (JsonException)
            {
                // A malformed legacy value must never break the admin screen.
                document = null;
            }
        }

        return Ok(new { matchId = match.Id, document, match.TicketArtworkUrl });
    }

    [HttpPut("{id:guid}/ticket-design")]
    [RequestSizeLimit(320 * 1024)]
    public async Task<IActionResult> SaveTicketDesign(Guid id, TicketDesignRequest request, CancellationToken ct)
    {
        var match = await db.Matches.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (match is null) return NotFound();

        if (request.Document.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            return BadRequest(new { message = "Le projet du designer est requis." });
        var raw = request.Document.GetRawText();
        if (Encoding.UTF8.GetByteCount(raw) > 256 * 1024)
            return BadRequest(new { message = "Le projet dépasse la limite de 256 Ko." });
        if (TicketDesignDocumentValidator.Validate(request.Document) is { } error)
            return BadRequest(new { message = error });

        match.TicketDesignJson = raw;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE_TICKET_DESIGN", "Match", id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { schemaVersion = 1, byteCount = Encoding.UTF8.GetByteCount(raw) }, ct);
        return Ok(new { matchId = id, document = request.Document.Clone() });
    }

    [HttpDelete("{id:guid}/ticket-design")]
    public async Task<IActionResult> ClearTicketDesign(Guid id, CancellationToken ct)
    {
        var match = await db.Matches.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (match is null) return NotFound();
        match.TicketDesignJson = null;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE_TICKET_DESIGN", "Match", id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    // Narrow publication endpoint: the designer updates only the flattened
    // public artwork URL, avoiding a stale full Match PUT during editing.
    [HttpPut("{id:guid}/ticket-artwork")]
    public async Task<IActionResult> SaveTicketArtwork(Guid id, TicketArtworkRequest request, CancellationToken ct)
    {
        var match = await db.Matches.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (match is null) return NotFound();
        if (TicketDesignDocumentValidator.ValidateAssetUrl(request.Url) is { } error)
            return BadRequest(new { message = error });
        match.TicketArtworkUrl = string.IsNullOrWhiteSpace(request.Url) ? null : request.Url.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE_TICKET_ARTWORK", "Match", id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { hasArtwork = match.TicketArtworkUrl is not null }, ct);
        return Ok(new { matchId = id, match.TicketArtworkUrl });
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
            OpponentLogoUrl = NormalizeLogoUrl(request.OpponentLogoUrl),
            TicketArtworkUrl = NormalizeLogoUrl(request.TicketArtworkUrl),
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
        match.OpponentLogoUrl = NormalizeLogoUrl(request.OpponentLogoUrl);
        match.TicketArtworkUrl = NormalizeLogoUrl(request.TicketArtworkUrl);
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

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var match = await db.Matches.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (match is null) return NotFound(new { message = "Match introuvable." });

        // Match events belong to the match and are removed explicitly.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var events = await db.MatchEvents.Where(x => x.MatchId == id).ToListAsync(ct);
            db.MatchEvents.RemoveRange(events);
            db.Matches.Remove(match);
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("DELETE", "Match", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { opponentName = match.OpponentName }, ct);
            await transaction.CommitAsync(ct);
            return NoContent();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            return Conflict(new { message = "Impossibile eliminare la partita perché è collegata ad altri dati (ad esempio biglietti, formazioni o dirette). Rimuovi o archivia prima i dati collegati." });
        }
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

    private static string? NormalizeLogoUrl(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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

public sealed record MatchRequest(Guid SeasonId, Guid CompetitionId, Guid TeamId, string OpponentName, DateTimeOffset KickoffAt, string? Venue, bool IsHome, int? HomeScore, int? AwayScore, string? Status, bool IsPublished, string? OpponentLogoUrl = null, string? TicketArtworkUrl = null);
public sealed record TicketDesignRequest(JsonElement Document);
public sealed record TicketArtworkRequest(string? Url);
public sealed record MatchEventRequest(int Minute, string Type, string? PlayerName, string? SecondaryPlayerName, string? Team, string? Notes);
