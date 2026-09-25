using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/news")]
public sealed class NewsDetailsController(JsoDbContext db) : ControllerBase
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
        var metadata = await db.ArticleMetadata.AsNoTracking().SingleOrDefaultAsync(x => x.ArticleId == article.Id, ct);
        return Ok(new { article, metadata });
    }
}
