using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management for the digital museum / historical archive (idea C10).
// All routes require the Editor or ClubAdmin role and every write is audited.
// The archive holds no sensitive personal data.
[ApiController]
[Authorize(Roles = "Editor,ClubAdmin")]
[Route("api/admin/archive")]
public sealed class AdminArchiveController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetItems(CancellationToken ct) =>
        Ok(await db.ArchiveItems.AsNoTracking()
            .OrderByDescending(x => x.Year == null)
            .ThenByDescending(x => x.Year)
            .ThenBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateItem(ArchiveItemRequest request, CancellationToken ct)
    {
        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var item = new ArchiveItem
        {
            Year = request.Year,
            Category = request.Category.Trim(),
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            MediaAssetId = request.MediaAssetId,
            DisplayOrder = request.DisplayOrder,
            IsPublished = request.IsPublished
        };
        db.ArchiveItems.Add(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ArchiveItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Year, item.Category, item.Title }, ct);
        return Created($"/api/admin/archive/{item.Id}", item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateItem(Guid id, ArchiveItemRequest request, CancellationToken ct)
    {
        var item = await db.ArchiveItems.FindAsync([id], ct);
        if (item is null) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        item.Year = request.Year;
        item.Category = request.Category.Trim();
        item.Title = request.Title.Trim();
        item.Body = request.Body.Trim();
        item.MediaAssetId = request.MediaAssetId;
        item.DisplayOrder = request.DisplayOrder;
        item.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "ArchiveItem", item.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { item.Year, item.Category, item.Title }, ct);
        return Ok(item);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken ct)
    {
        var item = await db.ArchiveItems.FindAsync([id], ct);
        if (item is null) return NotFound();

        db.ArchiveItems.Remove(item);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "ArchiveItem", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private async Task<string?> ValidateAsync(ArchiveItemRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Category)) return "Category is required.";
        if (string.IsNullOrWhiteSpace(r.Title)) return "Title is required.";
        if (string.IsNullOrWhiteSpace(r.Body)) return "Body is required.";
        if (r.Year is < 1900 or > 2200) return "Year must be between 1900 and 2200.";
        if (r.MediaAssetId is not null && !await db.MediaAssets.AnyAsync(m => m.Id == r.MediaAssetId, ct))
            return "Media asset does not exist.";
        return null;
    }
}

public sealed record ArchiveItemRequest(
    int? Year,
    string Category,
    string Title,
    string Body,
    Guid? MediaAssetId,
    int DisplayOrder = 0,
    bool IsPublished = true);
