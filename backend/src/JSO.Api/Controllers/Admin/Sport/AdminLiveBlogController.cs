using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin,Editor")]
[Route("api/admin/matches/{matchId:guid}/liveblog")]
public sealed class AdminLiveBlogController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] Kinds = ["Text", "Goal", "Card", "Substitution"];

    [HttpGet]
    public async Task<IActionResult> GetEntries(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        var rows = await db.LiveBlogEntries.AsNoTracking()
            .Where(x => x.MatchId == matchId)
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEntry(Guid matchId, LiveBlogEntryRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var entry = new LiveBlogEntry
        {
            MatchId = matchId,
            Minute = request.Minute,
            Kind = request.Kind.Trim(),
            Body = request.Body.Trim(),
            IsPinned = request.IsPinned,
            CreatedAt = DateTimeOffset.UtcNow
        };
        db.LiveBlogEntries.Add(entry);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "LiveBlogEntry", entry.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { entry.MatchId, entry.Kind, entry.Minute, entry.IsPinned }, ct);
        return Created($"/api/admin/matches/{matchId}/liveblog/{entry.Id}", entry);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEntry(Guid matchId, Guid id, LiveBlogEntryRequest request, CancellationToken ct)
    {
        var entry = await db.LiveBlogEntries.SingleOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (entry is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        entry.Minute = request.Minute;
        entry.Kind = request.Kind.Trim();
        entry.Body = request.Body.Trim();
        entry.IsPinned = request.IsPinned;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "LiveBlogEntry", entry.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { entry.MatchId, entry.Kind, entry.Minute, entry.IsPinned }, ct);
        return Ok(entry);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid matchId, Guid id, CancellationToken ct)
    {
        var entry = await db.LiveBlogEntries.SingleOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (entry is null) return NotFound();
        db.LiveBlogEntries.Remove(entry);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "LiveBlogEntry", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId }, ct);
        return NoContent();
    }

    private static string? Validate(LiveBlogEntryRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Body)) return "Body is required.";
        if (!Kinds.Contains(r.Kind)) return $"Kind must be one of: {string.Join(", ", Kinds)}.";
        if (r.Minute is < 0 or > 200) return "Minute must be between 0 and 200.";
        return null;
    }
}

public sealed record LiveBlogEntryRequest(
    string Body,
    string Kind = "Text",
    int? Minute = null,
    bool IsPinned = false);
