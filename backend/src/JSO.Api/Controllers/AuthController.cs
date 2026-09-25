using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record LoginRequest(string Email, string Password);

[ApiController]
[Route("api/auth")]
public sealed class AuthController(JsoDbContext db, JwtTokenService tokens, AuditService audit) : ControllerBase
{
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
