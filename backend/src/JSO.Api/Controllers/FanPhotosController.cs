using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Fan-facing UGC photo submission (idea A2). An authenticated fan uploads a
// photo (stadium/away trip); it is stored via a MediaAsset and a FanPhoto row
// is created in the mandatory "Pending" moderation state. Nothing becomes
// public until a moderator approves it.
//
// Security / privacy invariants:
//  - Every route requires the "Fan" role; admin tokens never carry "Fan".
//  - The FanUserId is ALWAYS resolved from the token claim, never from client
//    input, so a fan can only ever submit/list their OWN photos.
//  - Uploads are validated by declared content type AND magic-byte signature
//    (rejecting files disguised as images), max 10 MB, mirroring the storage
//    rules of AdminMediaController.
//  - Uploading implies consent to publication in the moderated community
//    gallery; the fan can later request removal (see FanPrivacy / admin delete).
[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/fan/photos")]
public sealed class FanPhotosController(JsoDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly IReadOnlyDictionary<string, (string Extension, byte[] Signature)> AllowedImageTypes =
        new Dictionary<string, (string, byte[])>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = (".jpg", [0xFF, 0xD8, 0xFF]),
            ["image/png"] = (".png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            ["image/webp"] = (".webp", [0x52, 0x49, 0x46, 0x46])
        };
    private const long MaxUploadBytes = 10 * 1024 * 1024;
    private const int MaxCaptionLength = 280;

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // List the current fan's own submissions with their moderation status.
    // Never exposes other fans' data.
    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var rows = await db.FanPhotos.AsNoTracking()
            .Where(p => p.FanUserId == fanId)
            .OrderByDescending(p => p.SubmittedAt)
            .Join(db.MediaAssets.AsNoTracking(), p => p.MediaAssetId, m => m.Id, (p, m) => new
            {
                p.Id,
                p.Caption,
                p.Status,
                p.SubmittedAt,
                Url = m.Url
            })
            .ToListAsync(ct);

        return Ok(rows);
    }

    [HttpPost]
    [RequestSizeLimit(MaxUploadBytes + 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? caption, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        if (file is null || file.Length == 0) return BadRequest(new { message = "File is required." });
        if (file.Length > MaxUploadBytes) return BadRequest(new { message = "Maximum file size is 10 MB." });
        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedImageTypes.TryGetValue(file.ContentType, out var imageType))
            return BadRequest(new { message = "Only JPEG, PNG and WebP images are supported." });
        if (caption is not null && caption.Trim().Length > MaxCaptionLength)
            return BadRequest(new { message = $"Caption must be {MaxCaptionLength} characters or fewer." });

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
        var relative = Path.Combine("uploads", "fan-photos", year, month, safeName);
        var absolute = Path.Combine(env.ContentRootPath, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        await using (var stream = System.IO.File.Create(absolute))
            await file.CopyToAsync(stream, ct);

        // Reuse MediaAsset for storage. The asset is not published on its own
        // (IsPublished = false); publication is driven exclusively by FanPhoto
        // moderation so nothing leaks before approval.
        var trimmedCaption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim();
        var asset = new MediaAsset
        {
            Title = "Photo supporter",
            Url = "/uploads/fan-photos/" + year + "/" + month + "/" + safeName,
            Type = "Image",
            Caption = trimmedCaption,
            IsPublished = false,
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType.ToLowerInvariant(),
            FileSize = file.Length,
            StoragePath = relative.Replace('\\', '/')
        };
        db.MediaAssets.Add(asset);

        var photo = new FanPhoto
        {
            FanUserId = fanId.Value,
            MediaAssetId = asset.Id,
            Caption = trimmedCaption,
            Status = "Pending"
        };
        db.FanPhotos.Add(photo);
        await db.SaveChangesAsync(ct);

        return Accepted(new
        {
            message = "Photo reçue. Elle sera visible dans la galerie après modération.",
            id = photo.Id,
            status = photo.Status
        });
    }

    private static bool HasMatchingSignature(ReadOnlySpan<byte> content, string contentType, byte[] signature)
    {
        if (content.Length < signature.Length || !content.StartsWith(signature)) return false;
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/png" => true,
            "image/webp" => content.Length >= 12 && content[8..12].SequenceEqual("WEBP"u8),
            _ => false
        };
    }
}
