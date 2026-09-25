using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
public sealed class AdminMediaController(JsoDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly string[] AllowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    private const long MaxUploadBytes = 10 * 1024 * 1024;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.MediaAssets.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct));

    [HttpPost("upload")]
    [RequestSizeLimit(MaxUploadBytes)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? title, [FromForm] string? caption, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "File is required." });
        if (file.Length > MaxUploadBytes) return BadRequest(new { message = "Maximum file size is 10 MB." });
        if (!AllowedImageTypes.Contains(file.ContentType.ToLowerInvariant())) return BadRequest(new { message = "Only JPEG, PNG, WebP and GIF images are supported." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeName = $"{Guid.NewGuid():N}{extension}";
        var relative = Path.Combine("uploads", "media", DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"), safeName);
        var absolute = Path.Combine(env.ContentRootPath, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        await using (var stream = System.IO.File.Create(absolute))
            await file.CopyToAsync(stream, ct);

        var asset = new MediaAsset
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            Url = "/uploads/media/" + DateTime.UtcNow.ToString("yyyy") + "/" + DateTime.UtcNow.ToString("MM") + "/" + safeName,
            Type = "Image",
            Caption = caption?.Trim(),
            IsPublished = true,
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            FileSize = file.Length,
            StoragePath = relative.Replace('\\', '/')
        };
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/media/{asset.Id}", asset);
    }

    [HttpPost]
    public async Task<IActionResult> Create(MediaRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { message = "Title and URL are required." });
        var asset = new MediaAsset { Title=request.Title.Trim(), Url=request.Url.Trim(), Type=request.Type?.Trim() ?? "Image", ThumbnailUrl=request.ThumbnailUrl?.Trim(), Caption=request.Caption?.Trim(), IsPublished=request.IsPublished };
        db.MediaAssets.Add(asset); await db.SaveChangesAsync(ct); return Created($"/api/admin/media/{asset.Id}", asset);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MediaRequest request, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return NotFound();
        asset.Title=request.Title.Trim(); asset.Url=request.Url.Trim(); asset.Type=request.Type?.Trim() ?? asset.Type; asset.ThumbnailUrl=request.ThumbnailUrl?.Trim(); asset.Caption=request.Caption?.Trim(); asset.IsPublished=request.IsPublished;
        await db.SaveChangesAsync(ct); return Ok(asset);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return NotFound();
        if (!string.IsNullOrWhiteSpace(asset.StoragePath)) {
            var absolute=Path.Combine(env.ContentRootPath, asset.StoragePath.Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(absolute)) System.IO.File.Delete(absolute);
        }
        db.MediaAssets.Remove(asset); await db.SaveChangesAsync(ct); return NoContent();
    }
}

public sealed record MediaRequest(string Title, string Url, string? Type, string? ThumbnailUrl, string? Caption, bool IsPublished = true);
