using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/media")]
public sealed class MediaController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    // Public image proxy: works for public and private repositories without exposing the GitHub token.
    [HttpGet("files/{**path}")]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetRepositoryFile(string path, [FromServices] JSO.Api.Storage.GitHubRepositoryMediaStorage storage, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(path) || path.Split('/').Any(p => p is "." or ".."))
            return BadRequest();

        try
        {
            var asset = await storage.OpenReadAsync(path, ct);
            Response.Headers.CacheControl = "public,max-age=3600,stale-while-revalidate=86400";
            Response.Headers["X-Content-Type-Options"] = "nosniff";
            if (!string.IsNullOrWhiteSpace(asset.ETag))
                Response.Headers.ETag = asset.ETag;
            return File(asset.Content, asset.ContentType, enableRangeProcessing: false);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound();
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
        }
        catch (ArgumentException)
        {
            return BadRequest();
        }
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var entities = await db.MediaAssets.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("MediaAsset", entities.Select(x => x.Id), ["title", "caption"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Title = ContentTranslationService.ResolveFromMap(map, "MediaAsset", x.Id, "title", x.Title, language),
            x.Url, x.Type, x.ThumbnailUrl,
            Caption = ContentTranslationService.ResolveFromMap(map, "MediaAsset", x.Id, "caption", x.Caption, language),
            x.IsPublished, x.CreatedAt, x.FileName, x.ContentType, x.FileSize
        }));
    }
}
