using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/account/me/photo")]
public sealed class FanProfilePhotoController(JsoDbContext db, IWebHostEnvironment env, AuditService audit) : ControllerBase
{
    private const long MaxBytes = 5 * 1024 * 1024;
    private static readonly IReadOnlyDictionary<string, (string Extension, byte[] Signature)> Types =
        new Dictionary<string, (string, byte[])>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = (".jpg", [0xFF, 0xD8, 0xFF]),
            ["image/png"] = (".png", [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            ["image/webp"] = (".webp", [0x52, 0x49, 0x46, 0x46])
        };

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpPost]
    [RequestSizeLimit(MaxBytes + 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        var id = CurrentFanId();
        if (id is null) return Unauthorized();
        if (file is null || file.Length == 0) return BadRequest(new { message = "Choisissez une photo." });
        if (file.Length > MaxBytes) return BadRequest(new { message = "La photo doit faire 5 Mo maximum." });
        if (!Types.TryGetValue(file.ContentType ?? "", out var kind))
            return BadRequest(new { message = "Formats acceptés : JPEG, PNG et WebP." });

        var signature = new byte[kind.Signature.Length];
        await using (var input = file.OpenReadStream())
        {
            var count = await input.ReadAsync(signature.AsMemory(), ct);
            if (count != signature.Length || !signature.AsSpan().SequenceEqual(kind.Signature))
                return BadRequest(new { message = "Le fichier ne semble pas être une image valide." });
        }

        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();
        var now = DateTime.UtcNow;
        var relativeDir = Path.Combine("uploads", "fan-profiles", now.ToString("yyyy"), now.ToString("MM"));
        var safeName = $"{Guid.NewGuid():N}{kind.Extension}";
        var relative = Path.Combine(relativeDir, safeName);
        var absolute = Path.Combine(env.ContentRootPath, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolute)!);
        await using (var output = System.IO.File.Create(absolute)) await file.CopyToAsync(output, ct);

        var oldUrl = fan.ProfilePhotoUrl;
        fan.ProfilePhotoUrl = "/" + relative.Replace('\\', '/');
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE_PROFILE_PHOTO", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        DeleteOldFile(oldUrl);
        return Ok(new { profilePhotoUrl = fan.ProfilePhotoUrl });
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(CancellationToken ct)
    {
        var id = CurrentFanId();
        if (id is null) return Unauthorized();
        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();
        var oldUrl = fan.ProfilePhotoUrl;
        fan.ProfilePhotoUrl = null;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE_PROFILE_PHOTO", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        DeleteOldFile(oldUrl);
        return NoContent();
    }

    private void DeleteOldFile(string? url)
    {
        const string allowedPrefix = "/uploads/fan-profiles/";
        if (string.IsNullOrWhiteSpace(url) ||
            !url.StartsWith(allowedPrefix, StringComparison.Ordinal))
            return;

        var profileRoot = Path.GetFullPath(Path.Combine(env.ContentRootPath, "uploads", "fan-profiles"));
        var relative = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var absolute = Path.GetFullPath(Path.Combine(env.ContentRootPath, relative));
        var profilePrefix = profileRoot.EndsWith(Path.DirectorySeparatorChar)
            ? profileRoot
            : profileRoot + Path.DirectorySeparatorChar;

        // Normalize first, then enforce containment to block ../ traversal.
        if (absolute.StartsWith(profilePrefix, StringComparison.OrdinalIgnoreCase) &&
            System.IO.File.Exists(absolute))
        {
            System.IO.File.Delete(absolute);
        }
    }
}
