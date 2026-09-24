using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/news")]
public sealed class AdminNewsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.Articles.AsNoTracking().OrderByDescending(x => x.PublishedAt).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(ArticleRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Slug))
            return BadRequest(new { message = "Title and slug are required." });

        if (await db.Articles.AnyAsync(x => x.Slug == request.Slug.Trim(), ct))
            return Conflict(new { message = "Slug already exists." });

        var article = new Article
        {
            Title = request.Title.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            Excerpt = request.Excerpt?.Trim() ?? "",
            Body = request.Body?.Trim() ?? "",
            Status = request.Status?.Trim() ?? "Draft",
            PublishedAt = request.PublishedAt,
            CoverImageUrl = request.CoverImageUrl?.Trim()
        };
        db.Articles.Add(article);
        await db.SaveChangesAsync(ct);
        return Created($"/api/admin/news/{article.Id}", article);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ArticleRequest request, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();

        if (await db.Articles.AnyAsync(x => x.Id != id && x.Slug == request.Slug.Trim(), ct))
            return Conflict(new { message = "Slug already exists." });

        article.Title = request.Title.Trim();
        article.Slug = request.Slug.Trim().ToLowerInvariant();
        article.Excerpt = request.Excerpt?.Trim() ?? "";
        article.Body = request.Body?.Trim() ?? "";
        article.Status = request.Status?.Trim() ?? "Draft";
        article.PublishedAt = request.PublishedAt;
        article.CoverImageUrl = request.CoverImageUrl?.Trim();
        await db.SaveChangesAsync(ct);
        return Ok(article);
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<IActionResult> Publish(Guid id, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();
        article.Status = "Published";
        article.PublishedAt ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(article);
    }
}

public sealed record ArticleRequest(string Title, string Slug, string? Excerpt, string? Body, string? Status, DateTimeOffset? PublishedAt, string? CoverImageUrl);
