using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record LoginRequest(string Email, string Password);

[ApiController]
[Route("api/auth")]
public sealed class AuthController(JsoDbContext db, JwtTokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        var user = await db.AdminUsers
            .SingleOrDefaultAsync(x => x.Email == request.Email.Trim().ToLowerInvariant() && x.IsActive, ct);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials." });

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Ok(new
        {
            accessToken = tokens.Create(user),
            user = new { user.Id, user.Email, user.DisplayName, user.Role }
        });
    }
}
