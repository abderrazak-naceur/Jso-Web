using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public reset endpoints deliberately return generic acknowledgements to avoid account enumeration.
public sealed record PasswordResetRequest(string Email);
public sealed record PasswordResetSubmit(string Email, string Token, string NewPassword);

public sealed class PasswordRecoveryController(
    JsoDbContext db,
    IConfiguration config,
    IHttpClientFactory httpClientFactory,
    ILogger<PasswordRecoveryController> log,
    AuditService audit) : ControllerBase
{
    private const string Generic = "If an active account exists for this email, a reset link will be sent shortly.";
    private const string ResendEndpoint = "https://api.resend.com/emails";

    [ApiController]
    [Route("api/password-recovery")]
    public sealed class RouteMarker { }

    [HttpPost("{userType}/request"), EnableRateLimiting("auth-login")]
    public async Task<IActionResult> RequestReset(string userType, PasswordResetRequest request, CancellationToken ct)
    {
        var type = TypeOf(userType);
        var email = request.Email?.Trim().ToLowerInvariant();
        if (type is null || string.IsNullOrWhiteSpace(email) || email.Length > 254 || !email.Contains('@'))
            return BadRequest(new { message = "A valid account type and email are required." });

        var exists = type == "admin"
            ? await db.AdminUsers.AnyAsync(x => x.Email == email && x.IsActive, ct)
            : await db.FanUsers.AnyAsync(x => x.Email == email && x.IsActive, ct);
        if (!exists) return Ok(new { message = Generic });

        var old = await db.PasswordResetTokens
            .Where(x => x.UserType == type && x.Email == email && x.UsedAt == null)
            .ToListAsync(ct);
        db.PasswordResetTokens.RemoveRange(old);

        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserType = type,
            Email = email,
            TokenHash = Hash(raw),
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(30)
        });
        await db.SaveChangesAsync(ct);

        var frontend = config["PasswordReset:FrontendUrl"]?.TrimEnd('/');
        var apiKey = config["Email:ResendApiKey"];
        var from = config["Email:From"];
        if (string.IsNullOrWhiteSpace(frontend) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(from))
        {
            log.LogError("Password recovery email configuration is missing (FrontendUrl, ResendApiKey, or From).");
            await RemoveTokenAsync(type, email, raw, ct);
            return Ok(new { message = Generic });
        }

        var link = $"{frontend}/password-reset?type={type}&email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(raw)}";
        var payload = new
        {
            from,
            to = new[] { email },
            subject = "JSO — Réinitialisation du mot de passe",
            text = $"Ouvrez ce lien pour réinitialiser votre mot de passe (valable 30 minutes, une seule utilisation) :\n\n{link}\n\nIgnorez ce message si vous n'avez rien demandé."
        };

        try
        {
            using var client = httpClientFactory.CreateClient("Resend");
            using var message = new HttpRequestMessage(HttpMethod.Post, ResendEndpoint)
            {
                Content = JsonContent.Create(payload)
            };
            message.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            using var response = await client.SendAsync(message, ct);
            if (!response.IsSuccessStatusCode)
            {
                log.LogError("Resend rejected password recovery email with status code {StatusCode}.", (int)response.StatusCode);
                await RemoveTokenAsync(type, email, raw, ct);
            }
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Could not send password reset email via Resend.");
            await RemoveTokenAsync(type, email, raw, ct);
        }

        return Ok(new { message = Generic });
    }

    [HttpPost("{userType}/reset"), EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Reset(string userType, PasswordResetSubmit request, CancellationToken ct)
    {
        var type = TypeOf(userType);
        var email = request.Email?.Trim().ToLowerInvariant();
        if (type is null || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(new { message = "The reset link is invalid or expired." });
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 12 || request.NewPassword.Length > 128)
            return BadRequest(new { message = "Le mot de passe doit contenir entre 12 et 128 caractères." });

        var now = DateTimeOffset.UtcNow;
        var hash = Hash(request.Token);
        var reset = await db.PasswordResetTokens.SingleOrDefaultAsync(
            x => x.UserType == type && x.Email == email && x.TokenHash == hash && x.UsedAt == null && x.ExpiresAt > now, ct);
        if (reset is null) return BadRequest(new { message = "The reset link is invalid or expired." });

        if (type == "admin")
        {
            var user = await db.AdminUsers.SingleOrDefaultAsync(x => x.Email == email && x.IsActive, ct);
            if (user is null) return BadRequest(new { message = "The reset link is invalid or expired." });
            user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
            await audit.LogAsync("RESET_PASSWORD", "AdminUser", user.Id.ToString(), user.Id.ToString(),
                user.Email, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        }
        else
        {
            var user = await db.FanUsers.SingleOrDefaultAsync(x => x.Email == email && x.IsActive, ct);
            if (user is null) return BadRequest(new { message = "The reset link is invalid or expired." });
            user.PasswordHash = PasswordHasher.Hash(request.NewPassword);
            await audit.LogAsync("RESET_PASSWORD", "FanUser", user.Id.ToString(), user.Id.ToString(),
                user.Email, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        }

        reset.UsedAt = now;
        var siblings = await db.PasswordResetTokens
            .Where(x => x.UserType == type && x.Email == email && x.Id != reset.Id && x.UsedAt == null)
            .ToListAsync(ct);
        db.PasswordResetTokens.RemoveRange(siblings);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Mot de passe mis à jour. Vous pouvez vous connecter." });
    }

    private async Task RemoveTokenAsync(string type, string email, string raw, CancellationToken ct)
    {
        var token = await db.PasswordResetTokens.SingleOrDefaultAsync(
            x => x.UserType == type && x.Email == email && x.TokenHash == Hash(raw), ct);
        if (token is null) return;
        db.PasswordResetTokens.Remove(token);
        await db.SaveChangesAsync(ct);
    }

    private static string? TypeOf(string value) =>
        value.Equals("admin", StringComparison.OrdinalIgnoreCase) ? "admin" :
        value.Equals("fan", StringComparison.OrdinalIgnoreCase) ? "fan" : null;

    private static string Hash(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
