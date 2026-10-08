using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin moderation queue for user-generated fan photos (idea A2). Every route
// requires the CommunityManager or Editor role and every write is audited.
// Moderation is mandatory before publication: a photo is created "Pending" and
// only becomes public once "Approved".
//
// Moderators see the full record (image URL, caption, status, submitter id) so
// they can moderate responsibly, including rejecting anything that raises a
// privacy concern (e.g. identifiable minors without consent).
[ApiController]
[Authorize(Roles = "CommunityManager,Editor")]
[Route("api/admin/fan-photos")]
public sealed class AdminFanPhotosController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] Statuses = ["Pending", "Approved", "Rejected"];

    // Full moderation queue, optionally filtered by status, newest first.
    [HttpGet]
    public async Task<IActionResult> GetPhotos([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.FanPhotos.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(x => x.Status == s);
        }
        var rows = await query
            .OrderByDescending(x => x.SubmittedAt)
            .Join(db.MediaAssets.AsNoTracking(), p => p.MediaAssetId, m => m.Id, (p, m) => new
            {
                p.Id,
                p.FanUserId,
                p.MediaAssetId,
                p.Caption,
                p.Status,
                p.SubmittedAt,
                p.ModeratedByAdminId,
                p.ModeratedAt,
                Url = m.Url
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    // Moderation: approve a pending/rejected photo so it appears in the public gallery.
    [HttpPost("{id:guid}/approve")]
    public Task<IActionResult> Approve(Guid id, CancellationToken ct) => SetStatusAsync(id, "Approved", "APPROVE", ct);

    // Moderation: reject a photo, keeping it out of the public gallery.
    [HttpPost("{id:guid}/reject")]
    public Task<IActionResult> Reject(Guid id, CancellationToken ct) => SetStatusAsync(id, "Rejected", "REJECT", ct);

    // Generic status update (PUT) to align with the plan's GET/PUT contract.
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStatus(Guid id, FanPhotoModerationRequest request, CancellationToken ct)
    {
        if (!Statuses.Contains(request.Status)) return BadRequest(new { message = "Invalid status." });
        return await SetStatusAsync(id, request.Status, "UPDATE", ct);
    }

    // Delete a photo, its moderation record and the underlying stored file
    // (right to erasure / storage hygiene).
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, [FromServices] IWebHostEnvironment env, CancellationToken ct)
    {
        var photo = await db.FanPhotos.FindAsync([id], ct);
        if (photo is null) return NotFound();

        var asset = await db.MediaAssets.FindAsync([photo.MediaAssetId], ct);
        if (asset is not null)
        {
            if (!string.IsNullOrWhiteSpace(asset.StoragePath))
            {
                var absolute = Path.Combine(env.ContentRootPath, asset.StoragePath.Replace('/', Path.DirectorySeparatorChar));
                if (System.IO.File.Exists(absolute)) System.IO.File.Delete(absolute);
            }
            db.MediaAssets.Remove(asset);
        }
        db.FanPhotos.Remove(photo);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "FanPhoto", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private async Task<IActionResult> SetStatusAsync(Guid id, string status, string action, CancellationToken ct)
    {
        var photo = await db.FanPhotos.FindAsync([id], ct);
        if (photo is null) return NotFound();

        var adminId = User.FindFirst("sub")?.Value;
        photo.Status = status;
        photo.ModeratedByAdminId = adminId;
        photo.ModeratedAt = DateTimeOffset.UtcNow;

        // Keep the underlying asset's publication flag in sync so a leaked
        // direct MediaAsset listing never surfaces an unapproved photo.
        var asset = await db.MediaAssets.FindAsync([photo.MediaAssetId], ct);
        if (asset is not null) asset.IsPublished = status == "Approved";

        await db.SaveChangesAsync(ct);
        await audit.LogAsync(action, "FanPhoto", photo.Id.ToString(), adminId,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { photo.Status }, ct);
        return Ok(new { photo.Id, photo.Status, photo.ModeratedAt, photo.ModeratedByAdminId });
    }
}

public sealed record FanPhotoModerationRequest(string Status);
