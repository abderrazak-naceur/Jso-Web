using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers.Admin.Community;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,CommunityManager")]
[Route("api/admin/fan-accounts")]
public sealed class AdminFanAccountsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAccounts([FromQuery] string? q, [FromQuery] bool? active, CancellationToken ct)
    {
        var query = db.FanUsers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLowerInvariant();
            query = query.Where(x => x.Email.ToLower().Contains(needle) || x.DisplayName.ToLower().Contains(needle));
        }
        if (active is bool isActive) query = query.Where(x => x.IsActive == isActive);

        var accounts = await query.OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id, x.Email, x.DisplayName, x.ProfilePhotoUrl, x.IsActive,
                x.EmailVerified, x.CreatedAt, x.LastLoginAt, x.LoginDaysCount,
                x.AnniversaryOptIn, x.FanRatingStars, x.IsVip
            })
            .Take(500)
            .ToListAsync(ct);
        return Ok(accounts);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] FanAccountStatusRequest request, CancellationToken ct)
    {
        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (fan is null) return NotFound(new { message = "Compte supporter introuvable." });

        fan.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(request.IsActive ? "UNBLOCK" : "BLOCK", "FanUser", fan.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { fan.Email, fan.IsActive }, ct);

        return Ok(new { fan.Id, fan.IsActive });
    }

    [HttpPut("{id:guid}/rating")]
    public async Task<IActionResult> SetRating(Guid id, [FromBody] FanAccountRatingRequest request, CancellationToken ct)
    {
        if (request.Stars is not (1 or 3 or 5))
            return BadRequest(new { message = "Le niveau doit être de 1, 3 ou 5 étoiles." });

        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (fan is null) return NotFound(new { message = "Compte supporter introuvable." });

        fan.FanRatingStars = request.Stars;
        fan.IsVip = request.Stars >= 3;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("SET_FAN_RATING", "FanUser", fan.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { fan.Email, fan.FanRatingStars, fan.IsVip }, ct);

        return Ok(new { fan.Id, fan.FanRatingStars, fan.IsVip });
    }
}

public sealed record FanAccountStatusRequest(bool IsActive);
public sealed record FanAccountRatingRequest(int Stars);
