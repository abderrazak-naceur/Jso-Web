using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only community endpoints (idea 4.3 / BE-009). Returns ONLY
// moderated (Approved) comments for a target, plus aggregate reaction counts.
// The shape is stable and consumable by both the web and Flutter clients.
//
// Privacy: NO PII is ever exposed here. Comments surface only a freely chosen
// display name (never an email, never the FanUserId). Reactions are returned as
// aggregate counts only, never as a list of who reacted. Pending/Rejected
// comments never appear.
//
// XSS: the comment body is returned as plain text; clients MUST render it
// escaped (React/Flutter Text do this by default). The API never wraps it in
// HTML.
[ApiController]
[Route("api/community")]
public sealed class CommunityController(JsoDbContext db) : ControllerBase
{
    private static (bool Ok, string Type, string Id) ParseTarget(string? targetType, string? targetId)
    {
        var type = (targetType ?? string.Empty).Trim();
        if (!CommunityFanController.TargetTypes.Contains(type)) return (false, type, string.Empty);
        if (!Guid.TryParse((targetId ?? string.Empty).Trim(), out var id)) return (false, type, string.Empty);
        return (true, type, id.ToString());
    }

    // Approved comments for a target, oldest first (natural reading order).
    [HttpGet("comments")]
    public async Task<IActionResult> GetComments(
        [FromQuery] string? targetType, [FromQuery] string? targetId, [FromQuery] int? take, CancellationToken ct)
    {
        var target = ParseTarget(targetType, targetId);
        if (!target.Ok) return BadRequest(new { message = "Invalid target." });

        var limit = take is > 0 and <= 200 ? take.Value : 100;
        var comments = await db.CommunityComments.AsNoTracking()
            .Where(c => c.TargetType == target.Type && c.TargetId == target.Id && c.Status == "Approved")
            .OrderBy(c => c.CreatedAt)
            .Take(limit)
            // Join to expose ONLY the display name, never email/FanUserId.
            .Join(db.FanUsers.AsNoTracking(), c => c.FanUserId, f => f.Id, (c, f) => new
            {
                c.Id,
                Author = f.DisplayName,
                c.Body,
                Date = c.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(comments);
    }

    // Aggregate reaction counts per kind for a target. Never reveals identities.
    [HttpGet("reactions")]
    public async Task<IActionResult> GetReactionCounts(
        [FromQuery] string? targetType, [FromQuery] string? targetId, CancellationToken ct)
    {
        var target = ParseTarget(targetType, targetId);
        if (!target.Ok) return BadRequest(new { message = "Invalid target." });

        var counts = await db.CommunityReactions.AsNoTracking()
            .Where(r => r.TargetType == target.Type && r.TargetId == target.Id)
            .GroupBy(r => r.Kind)
            .Select(g => new { Kind = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var total = counts.Sum(c => c.Count);
        return Ok(new { target.Type, target.Id, total, counts });
    }
}
