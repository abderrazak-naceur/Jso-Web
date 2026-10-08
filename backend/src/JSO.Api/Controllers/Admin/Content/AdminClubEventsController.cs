using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

// Admin CRUD for non-match club events (assemblées, entraînements ouverts, fêtes).
// Slug is unique across events; EndAt, when present, must be on or after StartAt.
// Every mutation is audited under entityType "ClubEvent".
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/events")]
public sealed class AdminClubEventsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetEvents(CancellationToken ct) =>
        Ok(await db.ClubEvents.AsNoTracking()
            .OrderByDescending(x => x.StartAt)
            .ToListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEvent(Guid id, CancellationToken ct)
    {
        var ev = await db.ClubEvents.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return ev is null ? NotFound() : Ok(ev);
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent(ClubEventRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var slug = request.Slug.Trim();
        if (await db.ClubEvents.AsNoTracking().AnyAsync(x => x.Slug == slug, ct))
            return Conflict(new { message = "Slug already exists." });

        var ev = new ClubEvent
        {
            Title = request.Title.Trim(),
            Slug = slug,
            Description = request.Description?.Trim(),
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            Location = request.Location?.Trim(),
            IsPublished = request.IsPublished
        };
        db.ClubEvents.Add(ev);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ClubEvent", ev.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { ev.Slug, ev.IsPublished }, ct);
        return Created($"/api/admin/events/{ev.Id}", ev);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, ClubEventRequest request, CancellationToken ct)
    {
        var ev = await db.ClubEvents.FindAsync([id], ct);
        if (ev is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var slug = request.Slug.Trim();
        if (await db.ClubEvents.AsNoTracking().AnyAsync(x => x.Slug == slug && x.Id != id, ct))
            return Conflict(new { message = "Slug already exists." });

        ev.Title = request.Title.Trim();
        ev.Slug = slug;
        ev.Description = request.Description?.Trim();
        ev.StartAt = request.StartAt;
        ev.EndAt = request.EndAt;
        ev.Location = request.Location?.Trim();
        ev.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "ClubEvent", ev.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { ev.Slug, ev.IsPublished }, ct);
        return Ok(ev);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, CancellationToken ct)
    {
        var ev = await db.ClubEvents.FindAsync([id], ct);
        if (ev is null) return NotFound();
        db.ClubEvents.Remove(ev);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "ClubEvent", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(ClubEventRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) return "Title is required.";
        if (string.IsNullOrWhiteSpace(r.Slug)) return "Slug is required.";
        if (r.EndAt is not null && r.EndAt < r.StartAt)
            return "EndAt must be on or after StartAt.";
        return null;
    }
}

public sealed record ClubEventRequest(
    string Title,
    string Slug,
    string? Description,
    DateTimeOffset StartAt,
    DateTimeOffset? EndAt,
    string? Location,
    bool IsPublished = false);
