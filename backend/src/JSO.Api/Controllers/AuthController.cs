using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace JSO.Api.Controllers;

public sealed record LoginRequest(string Email, string Password);

[ApiController]
[Route("api/auth")]
public sealed class AuthController(JsoDbContext db, JwtTokenService tokens, AuditService audit) : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
        if (string.IsNullOrWhiteSpace(role) || string.Equals(role, "Fan", StringComparison.OrdinalIgnoreCase))
            return Unauthorized();

        var subject = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(subject, out var id)) return Unauthorized();

        var user = await db.AdminUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.IsActive, ct);
        if (user is null || !string.Equals(user.Role, role, StringComparison.OrdinalIgnoreCase))
            return Unauthorized();

        return Ok(new { user.Id, user.Email, user.DisplayName, user.Role });
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.AdminUsers
            .SingleOrDefaultAsync(x => x.Email == normalizedEmail && x.IsActive, ct);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        await audit.LogAsync(
            "LOGIN",
            "AdminUser",
            user.Id.ToString(),
            user.Id.ToString(),
            user.Email,
            ipAddress,
            ct: ct);

        return Ok(new
        {
            accessToken = tokens.Create(user),
            user = new { user.Id, user.Email, user.DisplayName, user.Role }
        });
    }
}
