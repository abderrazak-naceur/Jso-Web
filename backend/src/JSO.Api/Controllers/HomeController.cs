using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/home")]
public sealed class HomeController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var club = await db.Clubs.AsNoTracking()
            .SingleOrDefaultAsync(x => x.ShortName == "JSO", ct);

        if (club is null)
            return NotFound();

        var now = DateTimeOffset.UtcNow;

        var nextMatch = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt >= now)
            .OrderBy(x => x.KickoffAt)
            .FirstOrDefaultAsync(ct);

        var recentMatches = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && x.KickoffAt < now)
            .OrderByDescending(x => x.KickoffAt)
            .Take(3)
            .ToListAsync(ct);

        var news = await db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published")
            .OrderByDescending(x => x.PublishedAt)
            .Take(3)
            .ToListAsync(ct);

        var language = ContentTranslationService.GetRequestLanguage(Request);
        if (club is not null)
            club.Description = await translations.ResolveAsync("Club", club.Id, "description", club.Description, language, ct);

        var articleMap = await translations.LoadAsync("Article", news.Select(x => x.Id), ["title", "excerpt", "body"], language, ct);
        foreach (var article in news)
        {
            article.Title = ContentTranslationService.ResolveFromMap(articleMap, "Article", article.Id, "title", article.Title, language);
            article.Excerpt = ContentTranslationService.ResolveFromMap(articleMap, "Article", article.Id, "excerpt", article.Excerpt, language);
            article.Body = ContentTranslationService.ResolveFromMap(articleMap, "Article", article.Id, "body", article.Body, language);
        }

        var content = await db.SiteContents.AsNoTracking()
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        return Ok(new
        {
            club,
            nextMatch,
            recentMatches,
            news,
            content
        });
    }
}
