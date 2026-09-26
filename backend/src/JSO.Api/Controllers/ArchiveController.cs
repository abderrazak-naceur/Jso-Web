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
public sealed class ArchiveController(JsoDbContext db) : ControllerBase
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

        var items = await query
            .OrderByDescending(x => x.Year == null)
            .ThenByDescending(x => x.Year)
            .ThenBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Year,
                x.Category,
                x.Title,
                x.Body,
                x.MediaAssetId,
                MediaUrl = db.MediaAssets
                    .Where(m => m.Id == x.MediaAssetId && m.IsPublished)
                    .Select(m => m.Url)
                    .FirstOrDefault(),
                x.DisplayOrder,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }
}
