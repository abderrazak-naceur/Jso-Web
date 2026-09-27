using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only supporters' wall (idea B7).
// Returns ONLY moderated (Approved) bricks, newest first, with an optional
// name search via querystring. The shape is stable and consumable by both the
// web and Flutter clients. No PII is exposed beyond the freely chosen
// DisplayName and Message; email, FanUserId, moderation status and internal
// timestamps are never surfaced here.
[ApiController]
[Route("api/supporters")]
public sealed class SupportersController(JsoDbContext db) : ControllerBase
{
    [HttpGet("wall")]
    public async Task<IActionResult> GetWall([FromQuery] string? name, CancellationToken ct)
    {
        var query = db.SupporterBricks.AsNoTracking().Where(x => x.Status == "Approved");

        if (!string.IsNullOrWhiteSpace(name))
        {
            var n = name.Trim();
            query = query.Where(x => EF.Functions.ILike(x.DisplayName, "%" + n + "%"));
        }

        var bricks = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.DisplayName,
                x.Message,
                x.Amount,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(bricks);
    }

    // Public proposal endpoint: a supporter can propose a brick which is created
    // in the "Pending" state and stays invisible until a CommunityManager
    // approves it. No payment is processed here (see TODO in SupporterBrick):
    // Amount is a declared figure and PaidAt stays null until a certified
    // provider confirms the payment.
    [HttpPost("wall")]
    public async Task<IActionResult> ProposeBrick(SupporterBrickProposal request, CancellationToken ct)
    {
        var error = Validate(request.DisplayName, request.Message, request.Amount);
        if (error is not null) return BadRequest(new { message = error });

        var brick = new SupporterBrick
        {
            DisplayName = request.DisplayName.Trim(),
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Amount = request.Amount,
            // Moderation mandatory before publication.
            Status = "Pending",
            // TODO payments: PaidAt stays null until a certified payment
            // provider confirms the transaction (out of scope this iteration).
            PaidAt = null
        };
        db.SupporterBricks.Add(brick);
        await db.SaveChangesAsync(ct);

        // Deliberately return only a minimal acknowledgement, never the internal
        // status or identifiers that could leak the moderation pipeline.
        return Accepted(new { message = "Proposition reçue. Elle sera visible après modération." });
    }

    internal static string? Validate(string? displayName, string? message, decimal amount)
    {
        if (string.IsNullOrWhiteSpace(displayName)) return "Display name is required.";
        if (displayName.Trim().Length > 80) return "Display name must be 80 characters or fewer.";
        if (message is not null && message.Trim().Length > 280) return "Message must be 280 characters or fewer.";
        if (amount < 0) return "Amount cannot be negative.";
        if (amount > 1_000_000_000m) return "Amount is out of range.";
        return null;
    }
}

public sealed record SupporterBrickProposal(string DisplayName, string? Message, decimal Amount);
