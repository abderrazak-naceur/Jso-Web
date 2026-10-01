using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only navigation feed (idea: "Menu/Footer editabili"). Returns
// only active items, optionally filtered by ?position=Header|Footer, ordered by
// DisplayOrder then Label. The shape is stable and consumable by web and
// Flutter clients. When nothing matches the endpoint returns an empty list so
// clients can fall back to their default menu.
[ApiController]
[Route("api/navigation")]
public sealed class NavigationController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? position, CancellationToken ct)
    {
        var query = db.NavigationItems.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(position))
        {
            var p = position.Trim();
            query = query.Where(x => x.Position == p);
        }

        var entities = await query
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Label)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("NavigationItem", entities.Select(x => x.Id), ["label"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Label = ContentTranslationService.ResolveFromMap(map, "NavigationItem", x.Id, "label", x.Label, language),
            x.Url, x.Position, x.DisplayOrder, x.OpensInNewTab
        }));
    }
}
