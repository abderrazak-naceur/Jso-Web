using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin CRUD for editable navigation items (idea: "Menu/Footer editabili").
// All writes are audited. Position must be Header or Footer. Url is stored as a
// plain string (route or absolute link); clients render it as an href, never as
// raw HTML (anti-XSS). Reuses the same ReorderRequest as home sections.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/navigation")]
public sealed class AdminNavigationController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] AllowedPositions = ["Header", "Footer"];

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) =>
        Ok(await db.NavigationItems.AsNoTracking()
            .OrderBy(x => x.Position).ThenBy(x => x.DisplayOrder).ThenBy(x => x.Label)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(NavigationItemRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var item = new NavigationItem
        {
            Label = request.Label.Trim(),
            Url = request.Url.Trim(),
            Position = request.Position.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive,
            OpensInNewTab = request.OpensInNewTab
        };
        db.NavigationItems.Add(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "NavigationItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Position, item.IsActive }, ct);
        return Created($"/api/admin/navigation/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, NavigationItemRequest request, CancellationToken ct)
    {
        var item = await db.NavigationItems.FindAsync([id], ct);
        if (item is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        item.Label = request.Label.Trim();
        item.Url = request.Url.Trim();
        item.Position = request.Position.Trim();
        item.DisplayOrder = request.DisplayOrder;
        item.IsActive = request.IsActive;
        item.OpensInNewTab = request.OpensInNewTab;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "NavigationItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Position, item.IsActive }, ct);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var item = await db.NavigationItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        db.NavigationItems.Remove(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "NavigationItem", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder(ReorderRequest request, CancellationToken ct)
    {
        if (request.Ids is null || request.Ids.Count == 0)
            return BadRequest(new { message = "Ids are required." });

        var items = await db.NavigationItems.Where(x => request.Ids.Contains(x.Id)).ToListAsync(ct);
        for (var i = 0; i < request.Ids.Count; i++)
        {
            var match = items.SingleOrDefault(x => x.Id == request.Ids[i]);
            if (match is not null) match.DisplayOrder = i;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("REORDER", "NavigationItem", null, User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { count = request.Ids.Count }, ct);
        return NoContent();
    }

    private static string? Validate(NavigationItemRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Label)) return "Label is required.";
        if (string.IsNullOrWhiteSpace(r.Url)) return "Url is required.";
        if (string.IsNullOrWhiteSpace(r.Position) || !AllowedPositions.Contains(r.Position.Trim()))
            return $"Position must be one of: {string.Join(", ", AllowedPositions)}.";
        return null;
    }
}

public sealed record NavigationItemRequest(
    string Label,
    string Url,
    string Position,
    int DisplayOrder = 0,
    bool IsActive = true,
    bool OpensInNewTab = false);
