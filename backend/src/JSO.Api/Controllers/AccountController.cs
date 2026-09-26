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
        var sub = User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();

        var fan = await db.FanUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (fan is null) return NotFound();

        return Ok(new { fan.Id, fan.Email, fan.DisplayName, fan.EmailVerified });
    }
}
