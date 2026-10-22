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
    private static int _lastCleanupDay;
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
            path.StartsWith("/profil", StringComparison.OrdinalIgnoreCase))
            return NoContent();

        // Collapse opaque path identifiers so analytics never retains raw IDs or emails.
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment =>
            {
                var decoded = Uri.UnescapeDataString(segment);
                return Guid.TryParse(decoded, out _) || long.TryParse(decoded, out _) ||
                    decoded.Contains('@') || decoded.Length >= 32
                    ? ":id"
                    : decoded;
            });
        path = "/" + string.Join("/", segments);
        if (path.Length > 300) path = path[..300];

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

        // Keep detailed analytics for at most 13 months. Cleanup is attempted
        // once per UTC day per process and can never break the page-view request.
        var today = DateTime.UtcNow.Year * 1000 + DateTime.UtcNow.DayOfYear;
        if (Interlocked.Exchange(ref _lastCleanupDay, today) != today)
        {
            try
            {
                var cutoff = DateTimeOffset.UtcNow.AddMonths(-13);
                await db.VisitorPageViews.Where(x => x.CreatedAt < cutoff).ExecuteDeleteAsync(ct);
            }
            catch { /* analytics retention cleanup is best-effort */ }
        }
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
        var query = db.VisitorPageViews.AsNoTracking().Where(x => x.CreatedAt >= since);
        var pageViews = await query.CountAsync(ct);
        var uniqueVisitors = await query.Select(x => x.VisitorKey).Distinct().CountAsync(ct);
        var daily = await query
            .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month, x.CreatedAt.Day })
            .OrderBy(x => x.Key.Year).ThenBy(x => x.Key.Month).ThenBy(x => x.Key.Day)
            .Select(x => new
            {
                x.Key.Year, x.Key.Month, x.Key.Day,
                views = x.Count(),
                visitors = x.Select(y => y.VisitorKey).Distinct().Count()
            }).ToListAsync(ct);
        var topPages = await query.GroupBy(x => x.Path).OrderByDescending(x => x.Count()).Take(12)
            .Select(x => new { path = x.Key, views = x.Count() }).ToListAsync(ct);
        var referrers = await query.Where(x => x.ReferrerHost != "").GroupBy(x => x.ReferrerHost)
            .OrderByDescending(x => x.Count()).Take(10).Select(x => new { host = x.Key, views = x.Count() }).ToListAsync(ct);
        var devices = await query.GroupBy(x => x.DeviceClass).OrderByDescending(x => x.Count())
            .Select(x => new { device = x.Key, views = x.Count() }).ToListAsync(ct);

        return Ok(new
        {
            windowDays = days,
            pageViews,
            uniqueVisitors,
            byDay = daily.Select(x => new { date = $"{x.Year:D4}-{x.Month:D2}-{x.Day:D2}", x.views, x.visitors }),
            topPages,
            referrers,
            devices
        });
    }
}
