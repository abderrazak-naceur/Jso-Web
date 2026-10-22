using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public gallery exposes only approved photos. Image bytes are served through
// this controller (not static-file middleware), so pending uploads remain private.
[ApiController]
[Route("api/fan-photos")]
public sealed class FanPhotoGalleryController(JsoDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetGallery([FromQuery] int? take, CancellationToken ct)
    {
        var limit = take is > 0 and <= 200 ? take.Value : 60;
        var photos = await db.FanPhotos.AsNoTracking()
            .Where(p => p.Status == "Approved")
            .OrderByDescending(p => p.SubmittedAt)
            .Select(p => new
            {
                p.Id,
                Caption = p.Caption,
                Date = p.SubmittedAt
            })
            .Take(limit)
            .ToListAsync(ct);

        return Ok(photos.Select(p => new
        {
            p.Id,
            Url = $"/api/fan-photos/{p.Id}/image",
            p.Caption,
            p.Date
        }));
    }

    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetApprovedImage(Guid id, CancellationToken ct)
    {
        var asset = await db.FanPhotos.AsNoTracking()
            .Where(p => p.Id == id && p.Status == "Approved")
            .Join(db.MediaAssets.AsNoTracking(), p => p.MediaAssetId, m => m.Id, (p, m) => new
            {
                m.StoragePath,
                m.ContentType
            })
            .SingleOrDefaultAsync(ct);

        if (asset is null || string.IsNullOrWhiteSpace(asset.StoragePath) || string.IsNullOrWhiteSpace(asset.ContentType))
            return NotFound();

        var contentType = asset.ContentType.ToLowerInvariant();
        if (contentType is not ("image/jpeg" or "image/png" or "image/webp"))
            return NotFound();

        // Only allow known fan-photo storage roots and reject traversal. The
        // uploads path is included for legacy files created before this fix.
        var normalizedRelative = asset.StoragePath.Replace('\\', '/').TrimStart('/');
        if (!normalizedRelative.StartsWith("private-uploads/fan-photos/", StringComparison.Ordinal)
            && !normalizedRelative.StartsWith("uploads/fan-photos/", StringComparison.Ordinal))
            return NotFound();

        var fullPath = Path.GetFullPath(Path.Combine(env.ContentRootPath, normalizedRelative));
        var privateRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "private-uploads", "fan-photos")) + Path.DirectorySeparatorChar;
        var legacyRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads", "fan-photos")) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(privateRoot, StringComparison.Ordinal)
            && !fullPath.StartsWith(legacyRoot, StringComparison.Ordinal))
            return NotFound();
        if (!System.IO.File.Exists(fullPath))
            return NotFound();

        Response.Headers.CacheControl = "public,max-age=300";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return PhysicalFile(fullPath, contentType);
    }
}
