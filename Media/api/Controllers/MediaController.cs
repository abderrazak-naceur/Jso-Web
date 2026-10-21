using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;

namespace JSO.Media.Api.Controllers;

[ApiController]
[Route("api/media")]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
public sealed class MediaController(MediaDbContext db, MediaStorageService storage, ILogger<MediaController> logger) : ControllerBase
{
    private static readonly Dictionary<string, (string Extension, byte[] Signature)> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = (".jpg", [0xFF, 0xD8, 0xFF]),
        ["image/png"] = (".png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        ["image/gif"] = (".gif", [0x47, 0x49, 0x46, 0x38]),
        ["image/webp"] = (".webp", [0x52, 0x49, 0x46, 0x46])
    };

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int page = 1, [FromQuery] int pageSize = 24, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = db.MediaAssets.AsNoTracking().Where(x => x.Type == "Image");
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(x => x.Title.Contains(q) || (x.FileName != null && x.FileName.Contains(q)));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("upload")]
    [EnableRateLimiting("media-upload")]
    [RequestSizeLimit((10 * 1024 * 1024) + (256 * 1024))]
    [RequestFormLimits(MultipartBodyLengthLimit = (10 * 1024 * 1024) + (256 * 1024))]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? title, [FromForm] string? caption, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "Seleziona un'immagine non vuota." });
        if (file.Length > 10 * 1024 * 1024) return BadRequest(new { error = "Dimensione massima: 10 MB." });
        if (!AllowedTypes.TryGetValue(file.ContentType, out var type)) return BadRequest(new { error = "Formato non supportato." });

        await using var inputStream = file.OpenReadStream();
        MemoryStream sanitizedStream;
        try
        {
            sanitizedStream = await ImageUploadSanitizer.SanitizeAsync(inputStream, file.ContentType, ct);
        }
        catch (Exception ex) when (ex is InvalidDataException or SixLabors.ImageSharp.UnknownImageFormatException or SixLabors.ImageSharp.InvalidImageContentException)
        {
            logger.LogWarning(ex, "Rejected invalid image upload");
            return BadRequest(new { error = "Il file non è un'immagine valida oppure supera i limiti di dimensione." });
        }
        await using var stream = sanitizedStream;

        var id = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;
        var relativePath = $"media/{now:yyyy/MM}/{id:N}{type.Extension}";
        try
        {
            await storage.SaveAsync(stream, relativePath, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Media SFTP upload failed for asset {AssetId}", id);
            return StatusCode(502, new { error = "Caricamento sullo storage non riuscito." });
        }

        var asset = new MediaAsset
        {
            Id = id,
            Title = string.IsNullOrWhiteSpace(title) ? Path.GetFileNameWithoutExtension(file.FileName) : title.Trim(),
            Url = storage.PublicUrl(relativePath),
            Type = "Image",
            Caption = caption,
            IsPublished = true,
            CreatedAt = now,
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            FileSize = stream.Length,
            StoragePath = "sftp:" + relativePath
        };

        try
        {
            db.MediaAssets.Add(asset);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Media metadata insert failed for asset {AssetId}", id);
            // This path was generated uniquely for this request. If metadata
            // persistence fails, best-effort cleanup prevents orphaned uploads.
            try
            {
                await storage.DeleteAsync(relativePath, ct);
            }
            catch (Exception cleanupEx)
            {
                logger.LogWarning(cleanupEx, "Could not clean up orphaned media file for asset {AssetId}", id);
            }
            return StatusCode(500, new { error = "Registrazione non riuscita: il sistema ha tentato di annullare il caricamento. Riprova o contatta l'amministratore." });
        }

        return Created(asset.Url, asset);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateMediaRequest request, CancellationToken ct)
    {
        var asset = await db.MediaAssets.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (asset is null) return NotFound();
        if (!IsManagedByThisService(asset))
            return Conflict(new { error = "Questo media è legacy o gestito da un altro sistema: modifica non consentita da JSO Media Manager." });
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { error = "Il titolo è obbligatorio." });
        asset.Title = request.Title.Trim();
        asset.Caption = request.Caption;
        asset.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        return Ok(asset);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var asset = await db.MediaAssets.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (asset is null) return NotFound();
        // Shared MediaAssets may contain legacy records. Never delete a record or file
        // unless this service can prove ownership through its explicit storage prefix.
        if (!IsManagedByThisService(asset))
            return Conflict(new { error = "Questo media è legacy o gestito da un altro sistema: eliminazione bloccata per proteggere i contenuti esistenti." });
        try { await storage.DeleteAsync(asset.StoragePath!["sftp:".Length..], ct); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Media SFTP delete failed for asset {AssetId}", id);
            return StatusCode(502, new { error = "File non eliminato; record mantenuto." });
        }
        db.MediaAssets.Remove(asset);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
    private static bool IsManagedByThisService(MediaAsset asset) =>
        asset.StoragePath?.StartsWith("sftp:media/", StringComparison.Ordinal) == true;
}

public sealed record UpdateMediaRequest(string Title, string? Caption, bool IsPublished);
