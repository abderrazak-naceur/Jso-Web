using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management + moderation for the supporters' wall (idea B7).
// Every route requires the CommunityManager or ClubAdmin role and every write
// is audited. Moderation is mandatory before a brick reaches the public wall:
// a brick is created "Pending" and only becomes public once "Approved".
//
// Payments are OUT OF SCOPE this iteration: Amount is a declared figure and
// PaidAt is optional/simulated. Real confirmation via a certified payment
// provider is a documented TODO — we never handle card data here.
[ApiController]
[Authorize(Roles = "CommunityManager,ClubAdmin")]
[Route("api/admin/supporters")]
public sealed class AdminSupportersController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] Statuses = ["Pending", "Approved", "Rejected"];

    // Full list across every moderation status, optionally filtered by status.
    [HttpGet]
    public async Task<IActionResult> GetBricks([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.SupporterBricks.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(x => x.Status == s);
        }
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBrick(SupporterBrickRequest request, CancellationToken ct)
    {
        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var brick = new SupporterBrick
        {
            FanUserId = request.FanUserId,
            DisplayName = request.DisplayName.Trim(),
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Amount = request.Amount,
            Status = Statuses.Contains(request.Status) ? request.Status : "Pending",
            // Simulated/optional payment timestamp; no real payment is processed.
            PaidAt = request.PaidAt
        };
        db.SupporterBricks.Add(brick);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "SupporterBrick", brick.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { brick.DisplayName, brick.Status, brick.Amount }, ct);
        return Created($"/api/admin/supporters/{brick.Id}", brick);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateBrick(Guid id, SupporterBrickRequest request, CancellationToken ct)
    {
        var brick = await db.SupporterBricks.FindAsync([id], ct);
        if (brick is null) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        brick.FanUserId = request.FanUserId;
        brick.DisplayName = request.DisplayName.Trim();
        brick.Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim();
        brick.Amount = request.Amount;
        if (Statuses.Contains(request.Status)) brick.Status = request.Status;
        brick.PaidAt = request.PaidAt;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "SupporterBrick", brick.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { brick.DisplayName, brick.Status, brick.Amount }, ct);
        return Ok(brick);
    }

    // Moderation: approve a pending/rejected brick so it appears on the public wall.
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveBrick(Guid id, CancellationToken ct) => await SetStatusAsync(id, "Approved", "APPROVE", ct);

    // Moderation: reject a brick, keeping it off the public wall.
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectBrick(Guid id, CancellationToken ct) => await SetStatusAsync(id, "Rejected", "REJECT", ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteBrick(Guid id, CancellationToken ct)
    {
        var brick = await db.SupporterBricks.FindAsync([id], ct);
        if (brick is null) return NotFound();
        db.SupporterBricks.Remove(brick);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "SupporterBrick", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private async Task<IActionResult> SetStatusAsync(Guid id, string status, string action, CancellationToken ct)
    {
        var brick = await db.SupporterBricks.FindAsync([id], ct);
        if (brick is null) return NotFound();
        brick.Status = status;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(action, "SupporterBrick", brick.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { brick.DisplayName, brick.Status }, ct);
        return Ok(brick);
    }

    private async Task<string?> ValidateAsync(SupporterBrickRequest r, CancellationToken ct)
    {
        var error = SupportersController.Validate(r.DisplayName, r.Message, r.Amount);
        if (error is not null) return error;
        if (r.FanUserId is not null && !await db.FanUsers.AnyAsync(f => f.Id == r.FanUserId, ct))
            return "Fan user does not exist.";
        return null;
    }
}

public sealed record SupporterBrickRequest(
    string DisplayName,
    string? Message,
    decimal Amount,
    Guid? FanUserId = null,
    string Status = "Pending",
    DateTimeOffset? PaidAt = null);
