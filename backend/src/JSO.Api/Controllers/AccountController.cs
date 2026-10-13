using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record FanRegisterRequest(
    string Email, string? DisplayName, string Password,
    string? FirstName = null, string? LastName = null,
    DateOnly? BirthDate = null, string? PhoneNumber = null,
    bool AnniversaryOptIn = false);
public sealed record FanLoginRequest(string Email, string Password);

[ApiController]
[Route("api/account")]
public sealed class AccountController(JsoDbContext db, JwtTokenService tokens, AuditService audit) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Register(FanRegisterRequest request, CancellationToken ct)
    {
        var hasPersonalDetails = request.FirstName is not null || request.LastName is not null
            || request.PhoneNumber is not null || request.BirthDate is not null;
        var displayName = hasPersonalDetails
            ? $"{request.FirstName?.Trim()} {request.LastName?.Trim()}".Trim()
            : request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(displayName)
            || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email, name and password are required." });
        if (hasPersonalDetails && (string.IsNullOrWhiteSpace(request.FirstName)
            || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.PhoneNumber)
            || request.BirthDate is null))
            return BadRequest(new { message = "First name, last name, birth date and phone are required." });
        if (displayName.Length > 100 || request.FirstName?.Trim().Length > 100 || request.LastName?.Trim().Length > 100)
            return BadRequest(new { message = "Name is too long." });
        if (request.BirthDate is DateOnly birthDate && !ValidBirthDate(birthDate))
            return BadRequest(new { message = "A valid birth date is required." });
        if (request.PhoneNumber is not null && !ValidPhone(request.PhoneNumber))
            return BadRequest(new { message = "A valid phone number is required." });

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
            DisplayName = displayName,
            FirstName = request.FirstName?.Trim(),
            LastName = request.LastName?.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            BirthDate = request.BirthDate,
            AnniversaryOptIn = request.AnniversaryOptIn,
            PasswordHash = PasswordHasher.Hash(request.Password),
            IsActive = true,
            LoginDaysCount = 1,
            LastLoginDate = DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime)
        };
        db.FanUsers.Add(fan);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("REGISTER", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);

        return Created($"/api/account/me", new
        {
            accessToken = tokens.CreateForFan(fan),
            user = new { fan.Id, fan.Email, fan.DisplayName, fan.FirstName, fan.LastName, fan.PhoneNumber, fan.BirthDate, fan.AnniversaryOptIn }
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
            user = new { fan.Id, fan.Email, fan.DisplayName, fan.FirstName, fan.LastName, fan.PhoneNumber, fan.BirthDate, fan.AnniversaryOptIn }
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
            fan.FirstName,
            fan.LastName,
            fan.PhoneNumber,
            fan.ProfilePhotoUrl,
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
    // Profile details and optional anniversary messages have separate purposes.
    // Turning anniversary messages off never removes the account's birth date.
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

        if (request.FirstName is not null || request.LastName is not null)
        {
            var firstName = (request.FirstName ?? fan.FirstName)?.Trim();
            var lastName = (request.LastName ?? fan.LastName)?.Trim();
            if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName)
                || firstName.Length > 100 || lastName.Length > 100)
                return BadRequest(new { message = "First and last name are required." });
            fan.FirstName = firstName;
            fan.LastName = lastName;
            fan.DisplayName = $"{firstName} {lastName}";
        }

        if (request.PhoneNumber is not null)
        {
            if (!ValidPhone(request.PhoneNumber))
                return BadRequest(new { message = "A valid phone number is required." });
            fan.PhoneNumber = request.PhoneNumber.Trim();
        }

        if (request.AnniversaryOptIn is bool optIn)
        {
            fan.AnniversaryOptIn = optIn;
        }

        if (request.BirthDate is not null)
        {
            var birth = request.BirthDate.Value;
            // Reject impossible dates (future or unrealistically old).
            if (!ValidBirthDate(birth))
                return BadRequest(new { message = "A valid birth date is required." });
            fan.BirthDate = birth;
        }

        await db.SaveChangesAsync(ct);

        await audit.LogAsync("UPDATE_PROFILE", "FanUser", fan.Id.ToString(), fan.Id.ToString(), fan.Email,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { fan.AnniversaryOptIn, HasBirthDate = fan.BirthDate is not null }, ct);

        return Ok(new
        {
            fan.Id,
            fan.Email,
            fan.DisplayName,
            fan.FirstName,
            fan.LastName,
            fan.PhoneNumber,
            fan.ProfilePhotoUrl,
            fan.EmailVerified,
            fan.BirthDate,
            fan.AnniversaryOptIn,
            fan.LoginDaysCount,
            MemberSince = fan.CreatedAt
        });
    }

    private static bool ValidBirthDate(DateOnly birth) =>
        birth.Year >= 1900 && birth <= DateOnly.FromDateTime(DateTimeOffset.UtcNow.UtcDateTime);

    private static bool ValidPhone(string phone)
    {
        var value = phone.Trim();
        return value.Length <= 32 && value.Count(char.IsDigit) is >= 7 and <= 15
            && value.All(c => char.IsDigit(c) || c is '+' or ' ' or '-' or '(' or ')');
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
// existing clients that omit them keep the current behaviour. Null leaves a
// field unchanged; anniversary consent is independent from the birth date.
public sealed record FanProfileUpdateRequest(
    string? DisplayName = null,
    DateOnly? BirthDate = null,
    bool? AnniversaryOptIn = null,
    string? FirstName = null,
    string? LastName = null,
    string? PhoneNumber = null);

public sealed record FanChangePasswordRequest(string CurrentPassword, string NewPassword);
