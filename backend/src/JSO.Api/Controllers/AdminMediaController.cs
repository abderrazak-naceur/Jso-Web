using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
public sealed class AdminMediaController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.MediaAssets.AsNoTracking().OrderByDescending(x => x.CreatedAt).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(MediaRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "Title and URL are required." });

        var asset = new MediaAsset
        {
            Title = request.Title.Trim(),
            Url = request.Url.Trim(),
            Type = request.Type?.Trim() ?? "Image",
            ThumbnailUrl = request.ThumbnailUrl?.Trim(),
            Caption = request.Caption?.Trim(),
            IsPublished = request.IsPublished
        };
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/media/{asset.Id}", asset);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MediaRequest request, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return NotFound();

        asset.Title = request.Title.Trim();
        asset.Url = request.Url.Trim();
        asset.Type = request.Type?.Trim() ?? asset.Type;
        asset.ThumbnailUrl = request.ThumbnailUrl?.Trim();
        asset.Caption = request.Caption?.Trim();
        asset.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        return Ok(asset);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return NotFound();
        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record MediaRequest(string Title, string Url, string? Type, string? ThumbnailUrl, string? Caption, bool IsPublished = true);
