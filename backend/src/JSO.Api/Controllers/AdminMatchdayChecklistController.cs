using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Reusable matchday checklist templates (idea D14). Standard operational steps
// that can be materialised onto any match. Admin only (MatchManager / ClubAdmin),
// every write audited, no public endpoint and no personal data.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/checklist-templates")]
public sealed class AdminChecklistTemplatesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetTemplates(CancellationToken ct) =>
        Ok(await db.MatchdayChecklistTemplateItems.AsNoTracking()
            .OrderByDescending(x => x.IsActive).ThenBy(x => x.DisplayOrder).ThenBy(x => x.Label)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateTemplate(ChecklistTemplateRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var item = new MatchdayChecklistTemplateItem
        {
            Label = request.Label.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsActive = request.IsActive
        };
        db.MatchdayChecklistTemplateItems.Add(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "MatchdayChecklistTemplateItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Label, item.IsActive }, ct);
        return Created($"/api/admin/checklist-templates/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, ChecklistTemplateRequest request, CancellationToken ct)
    {
        var item = await db.MatchdayChecklistTemplateItems.FindAsync([id], ct);
        if (item is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        item.Label = request.Label.Trim();
        item.DisplayOrder = request.DisplayOrder;
        item.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchdayChecklistTemplateItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Label, item.IsActive }, ct);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken ct)
    {
        var item = await db.MatchdayChecklistTemplateItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        db.MatchdayChecklistTemplateItems.Remove(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MatchdayChecklistTemplateItem", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(ChecklistTemplateRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Label)) return "Label is required.";
        return null;
    }
}

// Per-match checklist instances (idea D14). Lists items for a match, adds them,
// toggles Done and assigns a responsible admin, deletes them, and generates the
// checklist from active templates (idempotent by Label). Same role restriction
// and audit as the templates controller.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/matches/{matchId:guid}/checklist")]
public sealed class AdminMatchdayChecklistController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetItems(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        var rows = await db.MatchdayChecklistItems.AsNoTracking()
            .Where(x => x.MatchId == matchId)
            .GroupJoin(db.AdminUsers.AsNoTracking(), i => i.AssigneeAdminId, a => (Guid?)a.Id, (i, a) => new { i, a })
            .SelectMany(x => x.a.DefaultIfEmpty(), (x, a) => new
            {
                x.i.Id,
                x.i.MatchId,
                x.i.Label,
                x.i.Done,
                x.i.AssigneeAdminId,
                AssigneeName = a != null ? a.DisplayName : null,
                x.i.DisplayOrder,
                x.i.CreatedAt
            })
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    // Lightweight admin directory so MatchManager/ClubAdmin can assign a responsible
    // without needing the SuperAdmin-only security endpoint. Minimal fields only.
    [HttpGet("assignees")]
    public async Task<IActionResult> GetAssignees(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        return Ok(await db.AdminUsers.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayName)
            .Select(x => new { x.Id, x.DisplayName, x.Role })
            .ToListAsync(ct));
    }

    [HttpPost]
    public async Task<IActionResult> CreateItem(Guid matchId, ChecklistItemRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var label = request.Label.Trim();
        if (await db.MatchdayChecklistItems.AnyAsync(x => x.MatchId == matchId && x.Label == label, ct))
            return BadRequest(new { message = "A checklist item with this label already exists for this match." });

        var item = new MatchdayChecklistItem
        {
            MatchId = matchId,
            Label = label,
            Done = request.Done,
            AssigneeAdminId = request.AssigneeAdminId,
            DisplayOrder = request.DisplayOrder
        };
        db.MatchdayChecklistItems.Add(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "MatchdayChecklistItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId, item.Label, item.Done, item.AssigneeAdminId }, ct);
        return Created($"/api/admin/matches/{matchId}/checklist/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateItem(Guid matchId, Guid id, ChecklistItemRequest request, CancellationToken ct)
    {
        var item = await db.MatchdayChecklistItems.FirstOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (item is null) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var label = request.Label.Trim();
        if (await db.MatchdayChecklistItems.AnyAsync(x => x.MatchId == matchId && x.Label == label && x.Id != id, ct))
            return BadRequest(new { message = "A checklist item with this label already exists for this match." });

        item.Label = label;
        item.Done = request.Done;
        item.AssigneeAdminId = request.AssigneeAdminId;
        item.DisplayOrder = request.DisplayOrder;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchdayChecklistItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId, item.Label, item.Done, item.AssigneeAdminId }, ct);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid matchId, Guid id, CancellationToken ct)
    {
        var item = await db.MatchdayChecklistItems.FirstOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (item is null) return NotFound();
        db.MatchdayChecklistItems.Remove(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MatchdayChecklistItem", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId }, ct);
        return NoContent();
    }

    // Idempotent generation: creates one checklist item per active template item
    // whose Label is not already present on the match, preserving the template order.
    [HttpPost("generate")]
    public async Task<IActionResult> Generate(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();

        var templates = await db.MatchdayChecklistTemplateItems.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Label)
            .ToListAsync(ct);

        var existingLabels = await db.MatchdayChecklistItems
            .Where(x => x.MatchId == matchId)
            .Select(x => x.Label)
            .ToListAsync(ct);
        var existing = new HashSet<string>(existingLabels, StringComparer.OrdinalIgnoreCase);

        var created = new List<MatchdayChecklistItem>();
        foreach (var t in templates)
        {
            var label = t.Label.Trim();
            if (existing.Contains(label)) continue;
            existing.Add(label);
            created.Add(new MatchdayChecklistItem
            {
                MatchId = matchId,
                Label = label,
                DisplayOrder = t.DisplayOrder
            });
        }

        if (created.Count > 0)
        {
            db.MatchdayChecklistItems.AddRange(created);
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("GENERATE", "MatchdayChecklistItem", matchId.ToString(), User.FindFirst("sub")?.Value,
                User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
                new { matchId, createdCount = created.Count }, ct);
        }

        return Ok(new { created = created.Count });
    }

    private async Task<string?> ValidateAsync(ChecklistItemRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Label)) return "Label is required.";
        if (r.AssigneeAdminId is { } assignee && !await db.AdminUsers.AnyAsync(x => x.Id == assignee, ct))
            return "Assignee does not exist.";
        return null;
    }
}

public sealed record ChecklistTemplateRequest(
    string Label,
    int DisplayOrder = 0,
    bool IsActive = true);

public sealed record ChecklistItemRequest(
    string Label,
    bool Done = false,
    Guid? AssigneeAdminId = null,
    int DisplayOrder = 0);
