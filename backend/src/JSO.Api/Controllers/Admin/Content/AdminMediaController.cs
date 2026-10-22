using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
public sealed class AdminMediaController(JsoDbContext db, IWebHostEnvironment env, AuditService audit, IHttpClientFactory httpClientFactory, IConfiguration configuration) : ControllerBase
{
    private Task Audit(string action, Guid id, object? details, CancellationToken ct) =>
        audit.LogAsync(action, "MediaAsset", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), details, ct);

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
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? title, [FromForm] string? caption, [FromForm] bool addToMedia = true, CancellationToken ct = default)
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
        // Match-specific uploads are stored on disk for the match, but enter Media House only by explicit opt-in.
        if (!addToMedia)
            return Ok(new { url = asset.Url, title = asset.Title, isPublished = false });

        db.MediaAssets.Add(asset);
        await db.SaveChangesAsync(ct);
        await Audit("CREATE", asset.Id, new { asset.Title, asset.FileName, asset.FileSize }, ct);
        return Created($"/api/admin/media/{asset.Id}", asset);
    }

    // Store membership card artwork as versioned repository assets so it survives API container replacements.
    // Configure GitHub__Token on the API service with repository Contents: Read and write permission.
    [HttpPost("membership-artwork/{side}")]
    [RequestSizeLimit(MaxUploadBytes + 1024 * 1024)]
    public async Task<IActionResult> UploadMembershipArtwork(string side, IFormFile file, CancellationToken ct)
    {
        side = (side ?? string.Empty).Trim().ToLowerInvariant();
        if (side is not ("front" or "back"))
            return BadRequest(new { message = "Choose either front or back artwork." });
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "File is required." });
        if (file.Length > MaxUploadBytes)
            return BadRequest(new { message = "Maximum file size is 10 MB." });
        if (string.IsNullOrWhiteSpace(file.ContentType) ||
            !AllowedImageTypes.TryGetValue(file.ContentType, out var imageType) ||
            file.ContentType.Equals("image/gif", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Only JPEG, PNG and WebP images are supported." });

        await using var input = file.OpenReadStream();
        using var memory = new MemoryStream();
        await input.CopyToAsync(memory, ct);
        var bytes = memory.ToArray();
        var signatureLength = Math.Min(bytes.Length, 12);
        if (!HasMatchingSignature(bytes.AsSpan(0, signatureLength), file.ContentType, imageType.Signature))
            return BadRequest(new { message = "The file content does not match its declared image type." });

        var token = configuration["GitHub:Token"];
        if (string.IsNullOrWhiteSpace(token))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "GitHub artwork storage is not configured. Add GitHub__Token to the jso-api service on Render."
            });

        var repository = configuration["GitHub:Repository"] ?? "abderrazak-naceur/Jso-Web";
        var branch = configuration["GitHub:Branch"] ?? "main";
        if (!System.Text.RegularExpressions.Regex.IsMatch(repository, @"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$") ||
            !System.Text.RegularExpressions.Regex.IsMatch(branch, @"^[A-Za-z0-9_./-]+$"))
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "GitHub repository or branch configuration is invalid." });

        var hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var fileName = $"{side}-{hash[..16]}{imageType.Extension}";
        var repositoryPath = $"frontend/public/uploads/membership-cards/{fileName}";
        var encodedPath = string.Join("/", repositoryPath.Split('/').Select(Uri.EscapeDataString));
        var apiUrl = $"https://api.github.com/repos/{repository}/contents/{encodedPath}?ref={Uri.EscapeDataString(branch)}";
        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("JSO-Web-MembershipArtwork/1.0");
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        client.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");

        // Hash-based names are immutable; repeated uploads of identical bytes don't create extra commits.
        using (var existing = await client.GetAsync(apiUrl, ct))
        {
            if (existing.IsSuccessStatusCode)
                return Ok(new { url = $"https://raw.githubusercontent.com/{repository}/{Uri.EscapeDataString(branch)}/{encodedPath}", fileName, storedInGitHub = true, alreadyExisted = true });
            if (existing.StatusCode != System.Net.HttpStatusCode.NotFound)
                return StatusCode(StatusCodes.Status502BadGateway, new { message = "Could not check the GitHub artwork repository. Verify the token and repository permissions." });
        }

        var commitUrl = $"https://api.github.com/repos/{repository}/contents/{encodedPath}";
        using var request = new HttpRequestMessage(HttpMethod.Put, commitUrl)
        {
            Content = System.Net.Http.Json.JsonContent.Create(new
            {
                message = $"Add membership card {side} artwork ({hash[..12]})",
                branch,
                content = Convert.ToBase64String(bytes)
            })
        };
        using var response = await client.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "GitHub could not save the artwork. Check that the token has Contents: Read and write permission and that the main branch permits this commit." });

        var publicUrl = $"https://raw.githubusercontent.com/{repository}/{Uri.EscapeDataString(branch)}/{encodedPath}";
        return Ok(new { url = publicUrl, fileName, storedInGitHub = true, alreadyExisted = false });
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
        var validation = ValidateMediaRequest(request);
        if (validation is not null) return BadRequest(new { message = validation });
        var asset = new MediaAsset { Title=request.Title.Trim(), Url=request.Url.Trim(), Type=request.Type?.Trim() ?? "Image", ThumbnailUrl=request.ThumbnailUrl?.Trim(), Caption=request.Caption?.Trim(), IsPublished=request.IsPublished };
        db.MediaAssets.Add(asset); await db.SaveChangesAsync(ct);
        await Audit("CREATE", asset.Id, new { asset.Title }, ct);
        return Created($"/api/admin/media/{asset.Id}", asset);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MediaRequest request, CancellationToken ct)
    {
        var asset = await db.MediaAssets.FindAsync([id], ct);
        if (asset is null) return NotFound();
        var validation = ValidateMediaRequest(request);
        if (validation is not null) return BadRequest(new { message = validation });
        asset.Title=request.Title.Trim(); asset.Url=request.Url.Trim(); asset.Type=request.Type?.Trim() ?? asset.Type; asset.ThumbnailUrl=request.ThumbnailUrl?.Trim(); asset.Caption=request.Caption?.Trim(); asset.IsPublished=request.IsPublished;
        await db.SaveChangesAsync(ct);
        await Audit("UPDATE", asset.Id, new { asset.Title, asset.IsPublished }, ct);
        return Ok(asset);
    }

    private static string? ValidateMediaRequest(MediaRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 180)
            return "Title is required and must be at most 180 characters.";
        if (!IsSafeMediaUrl(request.Url) || !IsSafeOptionalMediaUrl(request.ThumbnailUrl))
            return "Media URLs must be relative site paths or absolute http/https URLs.";
        if (request.Type?.Trim().Length > 40 || request.Caption?.Trim().Length > 500)
            return "Media type or caption exceeds the allowed length.";
        return null;
    }

    private static bool IsSafeOptionalMediaUrl(string? value) =>
        string.IsNullOrWhiteSpace(value) || IsSafeMediaUrl(value);

    private static bool IsSafeMediaUrl(string value)
    {
        value = value.Trim();
        if (value.Length == 0 || value.Length > 2048 || value.Any(char.IsControl)
            || value.StartsWith("//", StringComparison.Ordinal)
            || value.StartsWith(@"\\", StringComparison.Ordinal))
            return false;
        if (Uri.TryCreate(value, UriKind.Absolute, out var absolute))
            return absolute.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                || absolute.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
        return !value.StartsWith('\\') && !value.StartsWith(':');
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
        db.MediaAssets.Remove(asset); await db.SaveChangesAsync(ct);
        await Audit("DELETE", asset.Id, new { asset.Title }, ct);
        return NoContent();
    }
}

public sealed record MediaRequest(string Title, string Url, string? Type, string? ThumbnailUrl, string? Caption, bool IsPublished = true);
