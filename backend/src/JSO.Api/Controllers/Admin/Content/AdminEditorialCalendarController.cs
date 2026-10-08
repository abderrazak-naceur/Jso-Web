using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

// Editorial calendar & scheduled publishing (idea D13).
// Adds an editorial workflow on top of the existing Article/News model:
//   - EditorialStatus: Draft -> Scheduled -> Published
//   - ScheduledAt: when a "Scheduled" article should go live
//
// Scheduled publishing is exposed as an idempotent POST endpoint
// (`publish-due`) rather than a background IHostedService. This keeps the
// mechanism simple and testable: any due articles are published when the
// endpoint is called (e.g. by an operator from the admin UI, or by a cron /
// scheduler hitting the API). Publishing aligns the pre-existing Status /
// PublishedAt fields so the public site keeps working unchanged.
[ApiController]
[Authorize(Roles = "Editor,ClubAdmin")]
[Route("api/admin/editorial-calendar")]
public sealed class AdminEditorialCalendarController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] EditorialStatuses = ["Draft", "Scheduled", "Published"];

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var items = await db.Articles.AsNoTracking()
            .OrderByDescending(x => x.ScheduledAt ?? x.PublishedAt ?? DateTimeOffset.MinValue)
            .ThenByDescending(x => x.PublishedAt)
            .Take(200)
            .Select(x => new EditorialCalendarItem(
                x.Id, x.Title, x.Slug, x.Status, x.EditorialStatus, x.ScheduledAt, x.PublishedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, EditorialScheduleRequest request, CancellationToken ct)
    {
        var article = await db.Articles.FindAsync([id], ct);
        if (article is null) return NotFound();

        var editorialStatus = (request.EditorialStatus ?? "").Trim();
        if (!EditorialStatuses.Contains(editorialStatus))
            return BadRequest(new { message = "EditorialStatus must be Draft, Scheduled or Published." });
        if (editorialStatus == "Scheduled" && request.ScheduledAt is null)
            return BadRequest(new { message = "ScheduledAt is required when EditorialStatus is Scheduled." });

        article.EditorialStatus = editorialStatus;
        article.ScheduledAt = editorialStatus == "Scheduled" ? request.ScheduledAt : null;

        // Keep the existing publication fields consistent with the editorial state.
        if (editorialStatus == "Published")
        {
            article.Status = "Published";
            article.PublishedAt ??= DateTimeOffset.UtcNow;
        }
        else
        {
            article.Status = "Draft";
            article.PublishedAt = null;
        }

        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Article", id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { article.EditorialStatus, article.ScheduledAt }, ct: ct);
        return Ok(new EditorialCalendarItem(article.Id, article.Title, article.Slug, article.Status, article.EditorialStatus, article.ScheduledAt, article.PublishedAt));
    }

    [HttpPost("publish-due")]
    public async Task<IActionResult> PublishDue(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var due = await db.Articles
            .Where(x => x.EditorialStatus == "Scheduled" && x.ScheduledAt != null && x.ScheduledAt <= now)
            .ToListAsync(ct);

        foreach (var article in due)
        {
            article.EditorialStatus = "Published";
            article.Status = "Published";
            article.PublishedAt ??= article.ScheduledAt ?? now;
        }

        if (due.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("PUBLISH_DUE", "Article", null, User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { count = due.Count, ids = due.Select(x => x.Id) }, ct: ct);
        }

        return Ok(new { published = due.Count, ids = due.Select(x => x.Id) });
    }
}

public sealed record EditorialCalendarItem(
    Guid Id, string Title, string Slug, string Status, string EditorialStatus, DateTimeOffset? ScheduledAt, DateTimeOffset? PublishedAt);

public sealed record EditorialScheduleRequest(string? EditorialStatus, DateTimeOffset? ScheduledAt);
