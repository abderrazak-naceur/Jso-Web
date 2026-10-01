using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/media")]
public sealed class MediaController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
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
