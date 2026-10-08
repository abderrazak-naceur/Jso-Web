using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Scouting notes on opposing teams and observed players (idea C9).
// Internal technical-staff tool: every route requires the MatchManager or
// ClubAdmin role, every write is audited and there is no public endpoint.
// Notes about youth-sector minors are only reachable through these roles.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/scouting-notes")]
public sealed class AdminScoutingNotesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] SubjectTypes = ["Opponent", "Player"];

    [HttpGet]
    public async Task<IActionResult> GetNotes([FromQuery] string? subjectType, [FromQuery] Guid? matchId, CancellationToken ct)
    {
        var query = db.ScoutingNotes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(subjectType))
        {
            var normalized = subjectType.Trim();
            if (!SubjectTypes.Contains(normalized))
                return BadRequest(new { message = $"Subject type must be one of: {string.Join(", ", SubjectTypes)}." });
            query = query.Where(x => x.SubjectType == normalized);
        }

        if (matchId is { } mid)
            query = query.Where(x => x.MatchId == mid);

        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateNote(ScoutingNoteRequest request, CancellationToken ct)
    {
        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var note = new ScoutingNote
        {
            Subject = request.Subject.Trim(),
            SubjectType = request.SubjectType.Trim(),
            MatchId = request.MatchId,
            Rating = request.Rating,
            Body = string.IsNullOrWhiteSpace(request.Body) ? null : request.Body.Trim(),
            // AuthorAdminId comes from the authenticated admin claim, not the client.
            AuthorAdminId = User.FindFirst("sub")?.Value
        };
        db.ScoutingNotes.Add(note);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ScoutingNote", note.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { note.Subject, note.SubjectType, note.MatchId, note.Rating }, ct);
        return Created($"/api/admin/scouting-notes/{note.Id}", note);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateNote(Guid id, ScoutingNoteRequest request, CancellationToken ct)
    {
        var note = await db.ScoutingNotes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (note is null) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        note.Subject = request.Subject.Trim();
        note.SubjectType = request.SubjectType.Trim();
        note.MatchId = request.MatchId;
        note.Rating = request.Rating;
        note.Body = string.IsNullOrWhiteSpace(request.Body) ? null : request.Body.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "ScoutingNote", note.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { note.Subject, note.SubjectType, note.MatchId, note.Rating }, ct);
        return Ok(note);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteNote(Guid id, CancellationToken ct)
    {
        var note = await db.ScoutingNotes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (note is null) return NotFound();
        db.ScoutingNotes.Remove(note);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "ScoutingNote", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { note.Subject, note.SubjectType }, ct);
        return NoContent();
    }

    private async Task<string?> ValidateAsync(ScoutingNoteRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Subject)) return "Subject is required.";
        if (!SubjectTypes.Contains(r.SubjectType)) return $"Subject type must be one of: {string.Join(", ", SubjectTypes)}.";
        if (r.Rating is { } rating && (rating < 1 || rating > 5)) return "Rating must be between 1 and 5.";
        if (r.MatchId is { } matchId && !await db.Matches.AnyAsync(x => x.Id == matchId, ct))
            return "Match does not exist.";
        return null;
    }
}

public sealed record ScoutingNoteRequest(
    string Subject,
    string SubjectType,
    Guid? MatchId,
    int? Rating,
    string? Body);
