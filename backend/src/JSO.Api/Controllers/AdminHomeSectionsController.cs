using System.Text.Json;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin CRUD for the Homepage Builder sections (idea: the club composes the
// public home without touching code). All writes are audited. PayloadJson must
// be valid JSON when present; it stays an opaque string. Type must be one of a
// known allow-list. CustomHtml/Text payloads are never rendered as raw HTML by
// the clients (anti-XSS) — this API only stores/validates the JSON string.
[ApiController]
[Authorize(Roles = "ClubAdmin,Editor")]
[Route("api/admin/home-sections")]
public sealed class AdminHomeSectionsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] AllowedTypes =
        ["Hero", "News", "Matches", "Media", "Sponsors", "CustomHtml", "Text"];

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await db.HomeSections.AsNoTracking()
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.CreatedAt)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(HomeSectionRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var section = new HomeSection
        {
            Type = request.Type.Trim(),
            Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim(),
            PayloadJson = string.IsNullOrWhiteSpace(request.PayloadJson) ? null : request.PayloadJson.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsPublished = request.IsPublished
        };
        db.HomeSections.Add(section);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "HomeSection", section.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { section.Type, section.IsPublished }, ct);
        return Created($"/api/admin/home-sections/{section.Id}", section);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, HomeSectionRequest request, CancellationToken ct)
    {
        var section = await db.HomeSections.FindAsync([id], ct);
        if (section is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        section.Type = request.Type.Trim();
        section.Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title.Trim();
        section.PayloadJson = string.IsNullOrWhiteSpace(request.PayloadJson) ? null : request.PayloadJson.Trim();
        section.DisplayOrder = request.DisplayOrder;
        section.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "HomeSection", section.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { section.Type, section.IsPublished }, ct);
        return Ok(section);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var section = await db.HomeSections.FindAsync([id], ct);
        if (section is null) return NotFound();
        db.HomeSections.Remove(section);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "HomeSection", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder(ReorderRequest request, CancellationToken ct)
    {
        if (request.Ids is null || request.Ids.Count == 0)
            return BadRequest(new { message = "Ids are required." });

        var sections = await db.HomeSections.Where(x => request.Ids.Contains(x.Id)).ToListAsync(ct);
        for (var i = 0; i < request.Ids.Count; i++)
        {
            var match = sections.SingleOrDefault(x => x.Id == request.Ids[i]);
            if (match is not null) match.DisplayOrder = i;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("REORDER", "HomeSection", null, User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { count = request.Ids.Count }, ct);
        return NoContent();
    }

    private static string? Validate(HomeSectionRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Type)) return "Type is required.";
        if (!AllowedTypes.Contains(r.Type.Trim()))
            return $"Type must be one of: {string.Join(", ", AllowedTypes)}.";
        if (!string.IsNullOrWhiteSpace(r.PayloadJson))
        {
            try { using var _ = JsonDocument.Parse(r.PayloadJson); }
            catch (JsonException) { return "PayloadJson must be valid JSON."; }
        }
        return null;
    }
}

public sealed record HomeSectionRequest(
    string Type,
    string? Title,
    string? PayloadJson,
    int DisplayOrder = 0,
    bool IsPublished = false);

public sealed record ReorderRequest(List<Guid> Ids);
