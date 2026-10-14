using JSO.Domain;
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


    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> UpdateAccount(Guid id, [FromBody] FanAccountUpdateRequest request, CancellationToken ct)
    {
        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (fan is null) return NotFound(new { message = "Compte supporter introuvable." });
        var displayName = (request.DisplayName ?? string.Empty).Trim();
        var email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (displayName.Length is < 2 or > 120)
            return BadRequest(new { message = "Le nom doit contenir entre 2 et 120 caractères." });
        if (email.Length is < 5 or > 254 || !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            return BadRequest(new { message = "Adresse e-mail invalide." });
        if (await db.FanUsers.AnyAsync(x => x.Id != id && x.Email == email, ct))
            return Conflict(new { message = "Cette adresse e-mail est déjà utilisée par un membre." });
        var oldEmail = fan.Email;
        var promotedAdmin = await db.AdminUsers.SingleOrDefaultAsync(x => x.Email == oldEmail, ct);
        if (promotedAdmin is not null && await db.AdminUsers.AnyAsync(x => x.Id != promotedAdmin.Id && x.Email == email, ct))
            return Conflict(new { message = "Cette adresse e-mail est déjà utilisée par un compte administratif." });
        fan.DisplayName = displayName;
        fan.Email = email;
        fan.FirstName = string.IsNullOrWhiteSpace(request.FirstName) ? null : request.FirstName.Trim();
        fan.LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim();
        fan.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        if (promotedAdmin is not null)
        {
            promotedAdmin.DisplayName = displayName;
            promotedAdmin.Email = email;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE_FAN_ACCOUNT", "FanUser", fan.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { oldEmail, fan.Email, fan.DisplayName, promotedAdminId = promotedAdmin?.Id }, ct);
        return Ok(new { fan.Id, fan.Email, fan.DisplayName, fan.FirstName, fan.LastName, fan.PhoneNumber });
    }

    [HttpPost("{id:guid}/promote")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> PromoteAccount(Guid id, [FromBody] FanAccountPromoteRequest request, CancellationToken ct)
    {
        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (fan is null) return NotFound(new { message = "Compte supporter introuvable." });
        if (!fan.IsActive) return BadRequest(new { message = "Réactivez le compte avant de le promouvoir." });
        if (!fan.EmailVerified) return BadRequest(new { message = "L'adresse e-mail doit être vérifiée avant la promotion." });
        var role = (request.Role ?? string.Empty).Trim();
        var allowedRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "ClubAdmin", "MatchManager", "FinanceManager", "ShopManager", "Editor",
            "CommunityManager", "TicketSeller", "TicketValidator", "TicketSupervisor", "SeasonManager"
        };
        if (!allowedRoles.Contains(role))
            return BadRequest(new { message = "Rôle administratif non autorisé pour cette opération." });
        if (await db.AdminUsers.AnyAsync(x => x.Email == fan.Email, ct))
            return Conflict(new { message = "Un compte administratif existe déjà avec cette adresse e-mail." });
        var admin = new AdminUser
        {
            Email = fan.Email,
            DisplayName = fan.DisplayName,
            PasswordHash = fan.PasswordHash,
            Role = role,
            IsActive = true
        };
        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("PROMOTE_FAN_TO_STAFF", "AdminUser", admin.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { fanId = fan.Id, admin.Email, admin.Role }, ct);
        return Created("/api/admin/security/users", new { admin.Id, admin.Email, admin.DisplayName, admin.Role, admin.IsActive });
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

public sealed record FanAccountUpdateRequest(string? DisplayName, string? Email, string? FirstName, string? LastName, string? PhoneNumber);
public sealed record FanAccountPromoteRequest(string? Role);
