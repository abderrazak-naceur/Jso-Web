using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only feed of downloadable club documents (comuniqués,
// règlements, formulaires). Returns only published documents, newest first,
// with an optional category filter. The shape is stable and consumable by web
// and Flutter clients.
[ApiController]
[Route("api/documents")]
public sealed class DocumentsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetDocuments([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.ClubDocuments.AsNoTracking().Where(x => x.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var entities = await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("ClubDocument", entities.Select(x => x.Id), ["title", "category"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Title = ContentTranslationService.ResolveFromMap(map, "ClubDocument", x.Id, "title", x.Title, language),
            Category = ContentTranslationService.ResolveFromMap(map, "ClubDocument", x.Id, "category", x.Category, language),
            x.FileUrl, x.CreatedAt
        }));
    }
}
