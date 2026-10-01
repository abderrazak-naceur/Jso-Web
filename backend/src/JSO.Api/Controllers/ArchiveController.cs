using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only digital museum / historical archive feed (idea C10).
// Returns published archive items ordered for a year-based timeline, optionally
// filtered by year and/or category via querystring. The shape is stable and
// consumable by web and Flutter clients. When an item references a MediaAsset,
// its published image URL is resolved server-side for convenience.
[ApiController]
[Route("api/archive")]
public sealed class ArchiveController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetArchive([FromQuery] int? year, [FromQuery] string? category, CancellationToken ct)
    {
        var query = db.ArchiveItems.AsNoTracking().Where(x => x.IsPublished);

        if (year is not null) query = query.Where(x => x.Year == year);
        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var entities = await query
            .OrderByDescending(x => x.Year == null)
            .ThenByDescending(x => x.Year)
            .ThenBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        var mediaIds = entities.Where(x => x.MediaAssetId.HasValue).Select(x => x.MediaAssetId!.Value).ToHashSet();
        var media = await db.MediaAssets.AsNoTracking().Where(x => mediaIds.Contains(x.Id) && x.IsPublished).ToDictionaryAsync(x => x.Id, x => x.Url, ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("ArchiveItem", entities.Select(x => x.Id), ["category", "title", "body"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id, x.Year,
            Category = ContentTranslationService.ResolveFromMap(map, "ArchiveItem", x.Id, "category", x.Category, language),
            Title = ContentTranslationService.ResolveFromMap(map, "ArchiveItem", x.Id, "title", x.Title, language),
            Body = ContentTranslationService.ResolveFromMap(map, "ArchiveItem", x.Id, "body", x.Body, language),
            x.MediaAssetId,
            MediaUrl = x.MediaAssetId.HasValue && media.TryGetValue(x.MediaAssetId.Value, out var mediaUrl) ? mediaUrl : null,
            x.DisplayOrder, x.CreatedAt
        }));
    }
}
