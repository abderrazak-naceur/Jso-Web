using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only homepage layout feed (idea: "Homepage Builder"). Returns
// only published sections ordered by DisplayOrder then CreatedAt. The shape is
// stable and consumable by web and Flutter clients. When nothing is published
// the endpoint returns an empty list so clients can fall back to their default
// layout. PayloadJson is returned as an opaque string; clients decide how to
// render it and must NOT inject raw HTML (anti-XSS).
[ApiController]
[Route("api/home-layout")]
public sealed class HomeLayoutController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var entities = await db.HomeSections.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var language = ContentTranslationService.GetRequestLanguage(Request);
        var map = await translations.LoadAsync("HomeSection", entities.Select(x => x.Id), ["title"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id, x.Type,
            Title = ContentTranslationService.ResolveFromMap(map, "HomeSection", x.Id, "title", x.Title, language),
            x.PayloadJson, x.DisplayOrder
        }));
    }
}
