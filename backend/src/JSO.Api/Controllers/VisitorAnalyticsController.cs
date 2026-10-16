using System.Net;
using System.Security.Cryptography;
using System.Text;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/analytics")]
public sealed class VisitorAnalyticsController(JsoDbContext db, IConfiguration configuration) : ControllerBase
{
    public sealed record PageViewRequest(string? Path, string? Referrer, string? DeviceClass, string? VisitorId);

    [HttpPost("page-view")]
    [AllowAnonymous]
    [RequestSizeLimit(4096)]
    public async Task<IActionResult> RecordPageView([FromBody] PageViewRequest request, CancellationToken ct)
    {
        // Analytics are opt-in: the browser only calls this endpoint after explicit consent.
        var rawPath = request.Path?.Trim();
        if (string.IsNullOrWhiteSpace(rawPath) || rawPath.Length > 300 || !rawPath.StartsWith('/') ||
            rawPath.StartsWith("//", StringComparison.Ordinal) || rawPath.Contains('\r') || rawPath.Contains('\n'))
            return BadRequest();

        // Never persist query strings, fragments, or likely secret/identity-bearing routes.
        var path = rawPath.Split('?', '#')[0];
        if (path.Length == 0 || path.StartsWith("/admin", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/password-reset", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/payment", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/account", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/profil", StringComparison.OrdinalIgnoreCase) ||
            path.Contains('@'))
            return NoContent();

        var visitorId = request.VisitorId?.Trim();
        if (string.IsNullOrWhiteSpace(visitorId) || visitorId.Length > 100)
            return BadRequest();

        var device = request.DeviceClass?.Trim().ToLowerInvariant();
        if (device is not ("mobile" or "tablet" or "desktop"))
            device = "unknown";

        var referrerHost = "";
        if (Uri.TryCreate(request.Referrer, UriKind.Absolute, out var referrer) &&
            (referrer.Scheme == Uri.UriSchemeHttps || referrer.Scheme == Uri.UriSchemeHttp))
            referrerHost = referrer.Host.ToLowerInvariant()[..Math.Min(referrer.Host.Length, 150)];

        // Use a keyed HMAC instead of storing the browser identifier directly.
        // Derive a purpose-specific key from the existing server secret when no
        // dedicated analytics key is configured. Never expose this key to the client.
        var masterKey = configuration["Analytics:VisitorHashKey"];
        if (string.IsNullOrWhiteSpace(masterKey))
        {
            var jwtKey = configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
            masterKey = Convert.ToHexString(HMACSHA256.HashData(
                Encoding.UTF8.GetBytes(jwtKey), Encoding.UTF8.GetBytes("JSO visitor analytics v1")));
        }

        var visitorKey = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(masterKey), Encoding.UTF8.GetBytes(visitorId)));
        db.VisitorPageViews.Add(new VisitorPageView
        {
            Path = path,
            ReferrerHost = referrerHost,
            DeviceClass = device,
            VisitorKey = visitorKey,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

[ApiController]
[Authorize(Roles = "SuperAdmin")]
[Route("api/admin/visitor-analytics")]
public sealed class AdminVisitorAnalyticsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int days = 30, CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 90);
        var since = DateTimeOffset.UtcNow.AddDays(-days);
        var rows = await db.VisitorPageViews.AsNoTracking().Where(x => x.CreatedAt >= since).ToListAsync(ct);
        return Ok(new
        {
            windowDays = days,
            pageViews = rows.Count,
            uniqueVisitors = rows.Select(x => x.VisitorKey).Distinct().Count(),
            byDay = rows.GroupBy(x => x.CreatedAt.UtcDateTime.ToString("yyyy-MM-dd"))
                .OrderBy(x => x.Key).Select(x => new { date = x.Key, views = x.Count(), visitors = x.Select(y => y.VisitorKey).Distinct().Count() }),
            topPages = rows.GroupBy(x => x.Path).OrderByDescending(x => x.Count()).Take(12)
                .Select(x => new { path = x.Key, views = x.Count() }),
            referrers = rows.Where(x => x.ReferrerHost != "").GroupBy(x => x.ReferrerHost)
                .OrderByDescending(x => x.Count()).Take(10).Select(x => new { host = x.Key, views = x.Count() }),
            devices = rows.GroupBy(x => x.DeviceClass).OrderByDescending(x => x.Count())
                .Select(x => new { device = x.Key, views = x.Count() })
        });
    }
}
