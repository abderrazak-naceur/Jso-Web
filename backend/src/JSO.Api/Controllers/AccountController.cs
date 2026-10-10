using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record FanRegisterRequest(string Email, string DisplayName, string Password);
public sealed record FanLoginRequest(string Email, string Password);

[ApiController]
[Route("api/account")]
public sealed class AccountController(JsoDbContext db, JwtTokenService tokens, AuditService audit) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Register(FanRegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.DisplayName)
            || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email, display name and password are required." });

        if (request.Password.Length < 12)
            return BadRequest(new { message = "Password must contain at least 12 characters." });

        var email = request.Email.Trim().ToLowerInvariant();
        if (!email.Contains('@') || email.Length < 5)
            return BadRequest(new { message = "A valid email is required." });

        if (await db.FanUsers.AnyAsync(x => x.Email == email, ct))
            return Conflict(new { message = "An account with this email already exists." });

        var fan = new FanUser
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = PasswordHasher.Hash(request.Password),
            IsActive = true
        };
        db.FanUsers.Add(fan);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("REGISTER", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);

        return Created($"/api/account/me", new
        {
            accessToken = tokens.CreateForFan(fan),
            user = new { fan.Id, fan.Email, fan.DisplayName }
        });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Login(FanLoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var email = request.Email.Trim().ToLowerInvariant();
        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Email == email && x.IsActive, ct);

        if (fan is null || !PasswordHasher.Verify(request.Password, fan.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });

        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime);
        if (fan.LastLoginDate != today)
        {
            fan.LoginDaysCount++;
            fan.LastLoginDate = today;
        }
        fan.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("LOGIN", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);

        return Ok(new
        {
            accessToken = tokens.CreateForFan(fan),
            user = new { fan.Id, fan.Email, fan.DisplayName }
        });
    }

    [HttpGet("me")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        // The JWT carries the id in "sub", but ASP.NET remaps it to
        // ClaimTypes.NameIdentifier, so read whichever is present.
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();

        var fan = await db.FanUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();

        return Ok(new
        {
            fan.Id,
            fan.Email,
            fan.DisplayName,
            fan.EmailVerified,
            // Idea A3: expose the birthday/anniversary opt-in state and the
            // membership date (CreatedAt) so the fan can review it.
            fan.BirthDate,
            fan.AnniversaryOptIn,
            fan.LoginDaysCount,
            MemberSince = fan.CreatedAt
        });
    }

    // Retrocompatible profile update for idea A3. Every field is optional, so
    // older clients that never send them keep working unchanged. The fan can
    // only act on their OWN profile (identity read from the JWT claims).
    //
    // Privacy/GDPR: BirthDate is personal data. It is processed only with the
    // fan's explicit consent (AnniversaryOptIn). When the fan turns the opt-in
    // off we also clear the stored BirthDate (data minimisation), and a fan may
    // clear the date at any time by sending an empty value.
    [HttpPut("me")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> UpdateMe(FanProfileUpdateRequest request, CancellationToken ct)
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();

        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();

        if (request.DisplayName is not null)
        {
            var name = request.DisplayName.Trim();
            if (name.Length == 0) return BadRequest(new { message = "Display name cannot be empty." });
            fan.DisplayName = name;
        }

        if (request.AnniversaryOptIn is bool optIn)
        {
            fan.AnniversaryOptIn = optIn;
            // Consent withdrawn: minimise data by dropping the stored birth date.
            if (!optIn) fan.BirthDate = null;
        }

        if (request.BirthDate is not null)
        {
            var birth = request.BirthDate.Value;
            // Reject impossible dates (future or unrealistically old).
            var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime);
            if (birth > today || birth.Year < 1900)
                return BadRequest(new { message = "A valid birth date is required." });
            fan.BirthDate = birth;
        }

        // Keep the birth date consistent with the current consent state: it is
        // only retained while the opt-in is (or becomes) active.
        if (!fan.AnniversaryOptIn) fan.BirthDate = null;

        await db.SaveChangesAsync(ct);

        await audit.LogAsync("UPDATE_PROFILE", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { fan.AnniversaryOptIn, HasBirthDate = fan.BirthDate is not null }, ct);

        return Ok(new
        {
            fan.Id,
            fan.Email,
            fan.DisplayName,
            fan.EmailVerified,
            fan.BirthDate,
            fan.AnniversaryOptIn,
            fan.LoginDaysCount,
            MemberSince = fan.CreatedAt
        });
    }

    // Change password for the signed-in fan: verify the current password, then
    // set a new one (same >= 12 chars rule as registration). The fan can only
    // change their OWN password (identity read from the JWT).
    [HttpPost("change-password")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> ChangePassword(FanChangePasswordRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Current and new passwords are required." });
        if (request.NewPassword.Length < 12)
            return BadRequest(new { message = "New password must contain at least 12 characters." });

        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();

        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();

        if (!PasswordHasher.Verify(request.CurrentPassword, fan.PasswordHash))
            return BadRequest(new { message = "The current password is incorrect." });

        fan.PasswordHash = PasswordHasher.Hash(request.NewPassword);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("CHANGE_PASSWORD", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);

        return Ok(new { message = "Password updated." });
    }
}

// Retrocompatible profile update payload (idea A3): all fields optional so
// existing clients that omit them keep the current behaviour. BirthDate uses a
// nullable DateOnly; sending null leaves it untouched, and clearing it happens
// automatically when AnniversaryOptIn is turned off.
public sealed record FanProfileUpdateRequest(
    string? DisplayName = null,
    DateOnly? BirthDate = null,
    bool? AnniversaryOptIn = null);

public sealed record FanChangePasswordRequest(string CurrentPassword, string NewPassword);
