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
    private static readonly IReadOnlyDictionary<string, (string Extension, byte[] Signature)> AllowedImageTypes =
        new Dictionary<string, (string, byte[])>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = (".jpg", [0xFF, 0xD8, 0xFF]),
            ["image/png"] = (".png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            ["image/webp"] = (".webp", [0x52, 0x49, 0x46, 0x46]),
            ["image/gif"] = (".gif", [0x47, 0x49, 0x46, 0x38])
        };
    private const long MaxUploadBytes = 10 * 1024 * 1024;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.MediaAssets.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(200).ToListAsync(ct));

    [HttpPost("upload")]
    [RequestSizeLimit(MaxUploadBytes + 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? title, [FromForm] string? caption, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "File is required." });
        if (file.Length > MaxUploadBytes) return BadRequest(new { message = "Maximum file size is 10 MB." });
        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedImageTypes.TryGetValue(file.ContentType, out var imageType))
            return BadRequest(new { message = "Only JPEG, PNG, WebP and GIF images are supported." });

        var signature = new byte[12];
        await using (var input = file.OpenReadStream())
        {
            var bytesRead = 0;
            while (bytesRead < signature.Length)
            {
                var count = await input.ReadAsync(signature.AsMemory(bytesRead), ct);
                if (count == 0) break;
                bytesRead += count;
            }
            if (!HasMatchingSignature(signature.AsSpan(0, bytesRead), file.ContentType, imageType.Signature))
                return BadRequest(new { message = "The file content does not match its declared image type." });
        }

        var extension = imageType.Extension;
        var safeName = $"{Guid.NewGuid():N}{extension}";
        var uploadedAtUtc = DateTime.UtcNow;
        var year = uploadedAtUtc.ToString("yyyy");
        var month = uploadedAtUtc.ToString("MM");
        var relative = Path.Combine("uploads", "media", year, month, safeName);
        var absolute = Path.Combine(env.ContentRootPath, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        await using (var stream = System.IO.File.Create(absolute))
            await file.CopyToAsync(stream, ct);

        var asset = new MediaAsset
        {
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            Url = "/uploads/media/" + year + "/" + month + "/" + safeName,
            Type = "Image",
            Caption = caption?.Trim(),
            IsPublished = true,
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType.ToLowerInvariant(),
            FileSize = file.Length,
            StoragePath = relative.Replace('\\', '/')
        };
        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/media/{asset.Id}", asset);
    }

    private static bool HasMatchingSignature(ReadOnlySpan<byte> content, string contentType, byte[] signature)
    {
        if (content.Length < signature.Length || !content.StartsWith(signature)) return false;
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/png" => true,
            "image/gif" => content.Length >= 6 &&
                           (content[..6].SequenceEqual("GIF87a"u8) || content[..6].SequenceEqual("GIF89a"u8)),
            "image/webp" => content.Length >= 12 && content[8..12].SequenceEqual("WEBP"u8),
            _ => false
        };
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
