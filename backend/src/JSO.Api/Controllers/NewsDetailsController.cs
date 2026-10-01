using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/news")]
public sealed class NewsDetailsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet("{slug}")]
    public async Task<IActionResult> Get(string slug, CancellationToken ct)
    {
        var article = await db.Articles.AsNoTracking()
            .Where(x => x.Status == "Published" && x.Slug == slug)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Slug,
                x.Excerpt,
                x.Body,
                x.PublishedAt,
                x.CoverImageUrl
            })
            .SingleOrDefaultAsync(ct);

        if (article is null) return NotFound();
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Article", [article.Id], ["title", "excerpt", "body"], language, ct);
        article = new
        {
            article.Id,
            Title = ContentTranslationService.ResolveFromMap(map, "Article", article.Id, "title", article.Title, language),
            article.Slug,
            Excerpt = ContentTranslationService.ResolveFromMap(map, "Article", article.Id, "excerpt", article.Excerpt, language),
            Body = ContentTranslationService.ResolveFromMap(map, "Article", article.Id, "body", article.Body, language),
            article.PublishedAt,
            article.CoverImageUrl
        };
        var metadata = await db.ArticleMetadata.AsNoTracking().SingleOrDefaultAsync(x => x.ArticleId == article.Id, ct);
        return Ok(new { article, metadata });
    }
}
