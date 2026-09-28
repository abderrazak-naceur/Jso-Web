using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin moderation queues for community interactions (idea 4.3 / BE-009 /
// BE-010). Two queues: pending comments and open reports. Every route requires
// the CommunityManager or ClubAdmin role and every write is audited.
//
// Moderation is mandatory before publication: a comment is created "Pending"
// and only becomes public once "Approved" (see the public read controller which
// only ever returns Approved comments).
//
// Moderators see the author display name (needed to moderate responsibly) but
// no email is ever surfaced. Bodies are returned as plain text for escaped
// rendering in the admin UI.
[ApiController]
[Authorize(Roles = "CommunityManager,ClubAdmin")]
[Route("api/admin/community")]
public sealed class AdminCommunityController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] CommentStatuses = ["Pending", "Approved", "Rejected"];
    public static readonly string[] ReportStatuses = ["Open", "Resolved", "Dismissed"];

    // Comment moderation queue, optionally filtered by status, newest first.
    [HttpGet("comments")]
    public async Task<IActionResult> GetComments([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.CommunityComments.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(x => x.Status == s);
        }
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Join(db.FanUsers.AsNoTracking(), c => c.FanUserId, f => f.Id, (c, f) => new
            {
                c.Id,
                Author = f.DisplayName,
                c.TargetType,
                c.TargetId,
                c.Body,
                c.Status,
                c.CreatedAt,
                c.ModeratedByAdminId,
                c.ModeratedAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("comments/{id:guid}/approve")]
    public Task<IActionResult> ApproveComment(Guid id, CancellationToken ct)
        => SetCommentStatusAsync(id, "Approved", "APPROVE", ct);

    [HttpPost("comments/{id:guid}/reject")]
    public Task<IActionResult> RejectComment(Guid id, CancellationToken ct)
        => SetCommentStatusAsync(id, "Rejected", "REJECT", ct);

    // Permanently delete a comment (e.g. after a report is upheld).
    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id, CancellationToken ct)
    {
        var comment = await db.CommunityComments.FindAsync([id], ct);
        if (comment is null) return NotFound();
        db.CommunityComments.Remove(comment);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "CommunityComment", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    // Report moderation queue, defaults to "Open", newest first.
    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] string? status, CancellationToken ct)
    {
        var s = string.IsNullOrWhiteSpace(status) ? "Open" : status.Trim();
        var rows = await db.CommunityReports.AsNoTracking()
            .Where(x => x.Status == s)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.TargetType,
                x.TargetId,
                x.Reason,
                x.Status,
                x.CreatedAt,
                x.HandledByAdminId,
                x.HandledAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("reports/{id:guid}/resolve")]
    public Task<IActionResult> ResolveReport(Guid id, CancellationToken ct)
        => SetReportStatusAsync(id, "Resolved", "RESOLVE", ct);

    [HttpPost("reports/{id:guid}/dismiss")]
    public Task<IActionResult> DismissReport(Guid id, CancellationToken ct)
        => SetReportStatusAsync(id, "Dismissed", "DISMISS", ct);

    private async Task<IActionResult> SetCommentStatusAsync(Guid id, string status, string action, CancellationToken ct)
    {
        var comment = await db.CommunityComments.FindAsync([id], ct);
        if (comment is null) return NotFound();

        var adminId = User.FindFirst("sub")?.Value;
        comment.Status = status;
        comment.ModeratedByAdminId = adminId;
        comment.ModeratedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(action, "CommunityComment", comment.Id.ToString(), adminId,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { comment.Status }, ct);
        return Ok(new { comment.Id, comment.Status, comment.ModeratedAt, comment.ModeratedByAdminId });
    }

    private async Task<IActionResult> SetReportStatusAsync(Guid id, string status, string action, CancellationToken ct)
    {
        var report = await db.CommunityReports.FindAsync([id], ct);
        if (report is null) return NotFound();

        var adminId = User.FindFirst("sub")?.Value;
        report.Status = status;
        report.HandledByAdminId = adminId;
        report.HandledAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(action, "CommunityReport", report.Id.ToString(), adminId,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { report.Status }, ct);
        return Ok(new { report.Id, report.Status, report.HandledAt, report.HandledByAdminId });
    }
}
