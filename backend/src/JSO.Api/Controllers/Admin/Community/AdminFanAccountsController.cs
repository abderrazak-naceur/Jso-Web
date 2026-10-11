using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers.Admin.Community;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,CommunityManager")]
[Route("api/admin/fan-accounts")]
public sealed class AdminFanAccountsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAccounts([FromQuery] string? q, [FromQuery] bool? active, CancellationToken ct)
    {
        var query = db.FanUsers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = q.Trim().ToLower();
            query = query.Where(x => x.Email.ToLower().Contains(needle) || x.DisplayName.ToLower().Contains(needle));
        }
        if (active is bool isActive) query = query.Where(x => x.IsActive == isActive);
        var accounts = await query.OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id, x.Email, x.DisplayName, x.ProfilePhotoUrl, x.IsActive,
                x.EmailVerified, x.CreatedAt, x.LastLoginAt, x.LoginDaysCount,
                x.AnniversaryOptIn
            })
            .Take(500)
            .ToListAsync(ct);
        return Ok(accounts);
    }
}
