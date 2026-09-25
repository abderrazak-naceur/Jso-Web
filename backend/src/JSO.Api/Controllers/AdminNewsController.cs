using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/news")]
public sealed class AdminNewsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.Articles.AsNoTracking().OrderByDescending(x => x.UpdatedAtOrPublished()).Take(100).ToListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var article = await db.Articles.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (article is null) return NotFound();
        var metadata = await db.ArticleMetadata.AsNoTracking().SingleOrDefaultAsync(x => x.ArticleId == id, ct);
        return Ok(new { article, metadata });
    }

    [HttpPost]
    public async Task<IActionResult> Create(ArticleRequest request, CancellationToken ct)
    {
        var validation = await Validate(request, null, ct);
        if (validation is not null) return validation;

        var article = new Article
        {
            Title = request.Title.Trim(),
            Slug = request.Slug.Trim().ToLowerInvariant(),
            Excerpt = request.Excerpt?.Trim() ?? "",
            Body = request.Body?.Trim() ?? "",
            Status = NormalizeStatus(request.Status),
            PublishedAt = NormalizePublishedAt(request.Status, request.PublishedAt),
            CoverImageUrl = request.CoverImageUrl?.Trim()
        };
        db.Articles.Add(article);
        await db.SaveChangesAsync(ct);
        await SaveMetadata(article.Id, request, ct);
        await audit.LogAsync("CREATE", "Article", article.Id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { article.Status }, ct: ct);
        return Created($"/api/admin/news/{article.Id}", article);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, ArticleRequest request, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();
        var validation = await Validate(request, id, ct);
        if (validation is not null) return validation;

        article.Title = request.Title.Trim();
        article.Slug = request.Slug.Trim().ToLowerInvariant();
        article.Excerpt = request.Excerpt?.Trim() ?? "";
        article.Body = request.Body?.Trim() ?? "";
        article.Status = NormalizeStatus(request.Status);
        article.PublishedAt = NormalizePublishedAt(request.Status, request.PublishedAt, article.PublishedAt);
        article.CoverImageUrl = request.CoverImageUrl?.Trim();
        await db.SaveChangesAsync(ct);
        await SaveMetadata(article.Id, request, ct);
        await audit.LogAsync("UPDATE", "Article", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { article.Status }, ct: ct);
        return Ok(article);
    }

    [HttpPost("{id:guid}/publish")]
    public Task<IActionResult> Publish(Guid id, CancellationToken ct) => SetStatus(id, "Published", ct);

    [HttpPost("{id:guid}/unpublish")]
    public Task<IActionResult> Unpublish(Guid id, CancellationToken ct) => SetStatus(id, "Draft", ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();
        db.Articles.Remove(article);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "Article", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private async Task<IActionResult?> Validate(ArticleRequest request, Guid? id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 180)
            return BadRequest(new { message = "Title is required and must be at most 180 characters." });
        if (string.IsNullOrWhiteSpace(request.Slug) || request.Slug.Trim().Length > 180)
            return BadRequest(new { message = "Slug is required and must be at most 180 characters." });
        if (string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { message = "Article body is required." });
        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await db.Articles.AnyAsync(x => x.Id != id && x.Slug == slug, ct))
            return Conflict(new { message = "Slug already exists." });
        if (request.Status is not null && request.Status is not ("Draft" or "Published"))
            return BadRequest(new { message = "Status must be Draft or Published." });
        return null;
    }

    private async Task SaveMetadata(Guid articleId, ArticleRequest request, CancellationToken ct)
    {
        var metadata = await db.ArticleMetadata.SingleOrDefaultAsync(x => x.ArticleId == articleId, ct);
        if (metadata is null) { metadata = new ArticleMetadata { ArticleId = articleId }; db.ArticleMetadata.Add(metadata); }
        metadata.AuthorName = request.AuthorName?.Trim();
        metadata.Category = request.Category?.Trim();
        metadata.Tags = request.Tags?.Trim();
        metadata.MetaTitle = request.MetaTitle?.Trim();
        metadata.MetaDescription = request.MetaDescription?.Trim();
        metadata.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    private async Task<IActionResult> SetStatus(Guid id, string status, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();
        article.Status = status;
        article.PublishedAt = status == "Published" ? (article.PublishedAt ?? DateTimeOffset.UtcNow) : null;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(status == "Published" ? "PUBLISH" : "UNPUBLISH", "Article", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Ok(article);
    }

    private static string NormalizeStatus(string? status) => status?.Trim() == "Published" ? "Published" : "Draft";
    private static DateTimeOffset? NormalizePublishedAt(string? status, DateTimeOffset? value, DateTimeOffset? existing = null) => NormalizeStatus(status) == "Published" ? (value ?? existing ?? DateTimeOffset.UtcNow) : null;
}

public sealed record ArticleRequest(
    string Title, string Slug, string? Excerpt, string? Body, string? Status, DateTimeOffset? PublishedAt,
    string? CoverImageUrl, string? AuthorName, string? Category, string? Tags, string? MetaTitle, string? MetaDescription);

file static class ArticleQueryExtensions
{
    public static DateTimeOffset UpdatedAtOrPublished(this Article article) => article.PublishedAt ?? DateTimeOffset.MinValue;
}
