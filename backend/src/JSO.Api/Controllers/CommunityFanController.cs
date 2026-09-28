using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Fan-facing community interactions (idea 4.3 / BE-009): an authenticated fan
// comments on / reacts to / reports a piece of content (a news article or a
// match). Every route requires the "Fan" role.
//
// Security / privacy invariants:
//  - The FanUserId is ALWAYS resolved from the token claim, never from client
//    input, so a fan can only ever act as themselves.
//  - Comments are created in the mandatory "Pending" moderation state and stay
//    invisible until a CommunityManager approves them (see the public read
//    controller, which only ever returns Approved comments).
//  - Writes are rate limited (policy "community-write", partitioned per fan) to
//    prevent flooding the moderation queue.
//  - Body/Reason are stored as plain text; clients MUST render them escaped to
//    avoid stored XSS. The API never wraps them in HTML.
[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/community")]
[EnableRateLimiting("community-write")]
public sealed class CommunityFanController(JsoDbContext db) : ControllerBase
{
    // Allowed content targets. Kept in one place so every endpoint validates
    // the same set and the public read controller can reuse it.
    public static readonly string[] TargetTypes = ["News", "Match"];
    // Allowed reaction kinds. A small closed vocabulary avoids arbitrary values.
    public static readonly string[] ReactionKinds = ["Like", "Love", "Clap"];

    private const int MaxBodyLength = 1000;
    private const int MaxReasonLength = 500;

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    // Validate the (targetType, targetId) pair: allowed type, parseable Guid and
    // an existing target row (so fans cannot attach content to phantom targets).
    private async Task<(bool Ok, string? Error, string Type, string Id)> ValidateTargetAsync(
        string? targetType, string? targetId, CancellationToken ct)
    {
        var type = (targetType ?? string.Empty).Trim();
        if (!TargetTypes.Contains(type))
            return (false, "Invalid target type.", type, string.Empty);
        if (!Guid.TryParse((targetId ?? string.Empty).Trim(), out var id))
            return (false, "Invalid target id.", type, string.Empty);

        var exists = type == "News"
            ? await db.Articles.AsNoTracking().AnyAsync(a => a.Id == id, ct)
            : await db.Matches.AsNoTracking().AnyAsync(m => m.Id == id, ct);
        if (!exists) return (false, "Target not found.", type, string.Empty);

        return (true, null, type, id.ToString());
    }

    // Post a comment on a target. Created "Pending"; never public until approved.
    [HttpPost("comments")]
    public async Task<IActionResult> CreateComment(CommentCreateRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var body = (request.Body ?? string.Empty).Trim();
        if (body.Length == 0) return BadRequest(new { message = "Comment body is required." });
        if (body.Length > MaxBodyLength)
            return BadRequest(new { message = $"Comment must be {MaxBodyLength} characters or fewer." });

        var target = await ValidateTargetAsync(request.TargetType, request.TargetId, ct);
        if (!target.Ok) return BadRequest(new { message = target.Error });

        var comment = new CommunityComment
        {
            FanUserId = fanId.Value,
            TargetType = target.Type,
            TargetId = target.Id,
            Body = body,
            Status = "Pending"
        };
        db.CommunityComments.Add(comment);
        await db.SaveChangesAsync(ct);

        return Accepted(new
        {
            message = "Commentaire reçu. Il sera visible après modération.",
            id = comment.Id,
            status = comment.Status
        });
    }

    // Put a reaction on a target. Idempotent: repeating the same kind is a no-op.
    [HttpPost("reactions")]
    public async Task<IActionResult> React(ReactionRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var kind = (request.Kind ?? string.Empty).Trim();
        if (!ReactionKinds.Contains(kind))
            return BadRequest(new { message = "Invalid reaction kind." });

        var target = await ValidateTargetAsync(request.TargetType, request.TargetId, ct);
        if (!target.Ok) return BadRequest(new { message = target.Error });

        var already = await db.CommunityReactions.AnyAsync(r =>
            r.FanUserId == fanId.Value && r.TargetType == target.Type
            && r.TargetId == target.Id && r.Kind == kind, ct);
        if (!already)
        {
            db.CommunityReactions.Add(new CommunityReaction
            {
                FanUserId = fanId.Value,
                TargetType = target.Type,
                TargetId = target.Id,
                Kind = kind
            });
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { target.Type, target.Id, kind, reacted = true });
    }

    // Remove a previously placed reaction. Idempotent: no-op if absent.
    [HttpDelete("reactions")]
    public async Task<IActionResult> Unreact(
        [FromQuery] string? targetType, [FromQuery] string? targetId, [FromQuery] string? kind, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var k = (kind ?? string.Empty).Trim();
        if (!ReactionKinds.Contains(k))
            return BadRequest(new { message = "Invalid reaction kind." });

        var target = await ValidateTargetAsync(targetType, targetId, ct);
        if (!target.Ok) return BadRequest(new { message = target.Error });

        var existing = await db.CommunityReactions.FirstOrDefaultAsync(r =>
            r.FanUserId == fanId.Value && r.TargetType == target.Type
            && r.TargetId == target.Id && r.Kind == k, ct);
        if (existing is not null)
        {
            db.CommunityReactions.Remove(existing);
            await db.SaveChangesAsync(ct);
        }
        return Ok(new { target.Type, target.Id, kind = k, reacted = false });
    }

    // Report a piece of content (typically a comment) for moderator review.
    [HttpPost("reports")]
    public async Task<IActionResult> Report(ReportRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var type = (request.TargetType ?? string.Empty).Trim();
        // Reports target moderatable content; "Comment" is the initial target.
        if (type != "Comment" && !TargetTypes.Contains(type))
            return BadRequest(new { message = "Invalid target type." });
        if (!Guid.TryParse((request.TargetId ?? string.Empty).Trim(), out var targetId))
            return BadRequest(new { message = "Invalid target id." });

        var reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        if (reason is not null && reason.Length > MaxReasonLength)
            return BadRequest(new { message = $"Reason must be {MaxReasonLength} characters or fewer." });

        db.CommunityReports.Add(new CommunityReport
        {
            ReporterFanUserId = fanId.Value,
            TargetType = type,
            TargetId = targetId.ToString(),
            Reason = reason,
            Status = "Open"
        });
        await db.SaveChangesAsync(ct);

        return Accepted(new { message = "Signalement reçu. Merci, notre équipe va l'examiner." });
    }
}

public sealed record CommentCreateRequest(string TargetType, string TargetId, string Body);
public sealed record ReactionRequest(string TargetType, string TargetId, string Kind);
public sealed record ReportRequest(string TargetType, string TargetId, string? Reason = null);
