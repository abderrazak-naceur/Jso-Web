using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin oversight for the GDPR data export / erasure centre (idea E17). Every
// route requires the SuperAdmin or ClubAdmin role and the read is audited.
//
// Privacy: this view lists export and deletion requests with their lifecycle
// state and aggregate counts only. It exposes the requesting FanUserId (needed
// to trace a request) but NO other personal data (no email, name, or export
// payload), so it never surfaces unnecessary PII of fans.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/gdpr")]
public sealed class AdminGdprController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // Combined overview: export and deletion requests (newest first) plus
    // per-status counts for a quick compliance dashboard.
    [HttpGet]
    public async Task<IActionResult> GetRequests(CancellationToken ct)
    {
        var exports = await db.DataExportRequests.AsNoTracking()
            .OrderByDescending(x => x.RequestedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.FanUserId,
                x.RequestedAt,
                x.Status,
                x.CompletedAt
            })
            .ToListAsync(ct);

        var deletions = await db.AccountDeletionRequests.AsNoTracking()
            .OrderByDescending(x => x.RequestedAt)
            .Take(200)
            .Select(x => new
            {
                x.Id,
                x.FanUserId,
                x.RequestedAt,
                x.Status,
                x.CompletedAt
            })
            .ToListAsync(ct);

        var exportCounts = exports
            .GroupBy(x => x.Status)
            .ToDictionary(g => g.Key, g => g.Count());
        var deletionCounts = deletions
            .GroupBy(x => x.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        await audit.LogAsync("VIEW", "GdprRequests", null, User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { exports = exports.Count, deletions = deletions.Count }, ct);

        return Ok(new
        {
            exportRequests = exports,
            deletionRequests = deletions,
            counts = new
            {
                exports = new { total = exports.Count, byStatus = exportCounts },
                deletions = new { total = deletions.Count, byStatus = deletionCounts }
            }
        });
    }
}
