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

        return article is null ? NotFound() : Ok(article);
    }
}
