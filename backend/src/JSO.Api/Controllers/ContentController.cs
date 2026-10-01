using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/content")]
public sealed class ContentController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var rows = await db.SiteContents.AsNoTracking()
            .Where(x => !x.Key.StartsWith("i18n:"))
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadNamedAsync("SiteContent", rows.Keys, "value", language, ct);
        foreach (var key in rows.Keys.ToArray())
        {
            if (map.TryGetValue(key, out var translated) && !string.IsNullOrWhiteSpace(translated))
                rows[key] = translated;
        }
        return Ok(rows);
    }
}
