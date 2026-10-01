using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only FAQ feed. Returns only published entries ordered by
// SortOrder then CreatedAt, with an optional ?category= filter. The shape is
// stable and consumable by web and Flutter clients.
[ApiController]
[Route("api/faq")]
public sealed class FaqController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFaq([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.FaqEntries.AsNoTracking().Where(x => x.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var entities = await query
            .OrderBy(x => x.SortOrder).ThenBy(x => x.CreatedAt)
            .ToListAsync(ct);
        var language = ContentTranslationService.GetRequestLanguage(Request);
        var map = await translations.LoadAsync("FaqEntry", entities.Select(x => x.Id), ["question", "answer", "category"], language, ct);
        var items = entities.Select(x => new
        {
            x.Id,
            Question = ContentTranslationService.ResolveFromMap(map, "FaqEntry", x.Id, "question", x.Question, language),
            Answer = ContentTranslationService.ResolveFromMap(map, "FaqEntry", x.Id, "answer", x.Answer, language),
            Category = ContentTranslationService.ResolveFromMap(map, "FaqEntry", x.Id, "category", x.Category, language),
            x.SortOrder
        }).ToList();

        return Ok(items);
    }
}
