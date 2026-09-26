using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor,MatchManager,CommunityManager,ShopManager")]
[Route("api/admin")]
public sealed class AdminDashboardController(JsoDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var startOfDay = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);

        // Security note: the dashboard is authorized to a broad role set (see [Authorize] above),
        // so it must NOT leak the sensitive audit fields (IpAddress / Details). The full audit log
        // stays exclusive to the SuperAdmin-only AdminAuditController (/api/admin/audit). Here we
        // expose only a SAFE, synthetic projection of the last audit events (id, action, entityType,
        // entityId, userEmail, createdAt) via the .Select(...) below so excluded columns never serialize.
        var recentActivity = await db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new
            {
                id = x.Id,
                action = x.Action,
                entityType = x.EntityType,
                entityId = x.EntityId,
                userEmail = x.UserEmail,
                createdAt = x.CreatedAt
            })
            .ToListAsync(ct);

        var todayActivity = new
        {
            newsPublished = await db.Articles.CountAsync(
                x => x.Status == "Published" && x.PublishedAt != null && x.PublishedAt >= startOfDay, ct),
            matchesToday = await db.Matches.CountAsync(
                x => x.KickoffAt >= startOfDay && x.KickoffAt < startOfDay.AddDays(1), ct),
            mediaUploaded = await db.MediaAssets.CountAsync(x => x.CreatedAt >= startOfDay, ct),
            auditActions = await db.AuditLogs.CountAsync(x => x.CreatedAt >= startOfDay, ct)
        };

        var result = new
        {
            matches = new
            {
                upcoming = await db.Matches.CountAsync(x => x.IsPublished && x.KickoffAt >= now, ct),
                finished = await db.Matches.CountAsync(x => x.IsPublished && x.Status == "Finished", ct)
            },
            news = new
            {
                published = await db.Articles.CountAsync(x => x.Status == "Published", ct),
                drafts = await db.Articles.CountAsync(x => x.Status == "Draft", ct)
            },
            teams = await db.Teams.CountAsync(x => x.IsActive, ct),
            players = await db.Players.CountAsync(x => x.IsActive, ct),
            todayActivity,
            recentActivity
        };

        return Ok(result);
    }
}
