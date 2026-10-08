using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// API usage & quota dashboard (idea E16).
//
// Exposes ONLY aggregate counters collected by ApiUsageMiddleware: request
// volume per day, per coarse route group and per status class, plus a static
// free-tier quota indicator so the club can anticipate cloud costs before
// crossing the thresholds. No personal data is ever read or returned: there is
// no IP address, no user id and no raw path with ids anywhere in the response.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/api-usage")]
public sealed class AdminApiUsageController(JsoDbContext db) : ControllerBase
{
    // Static free-tier style monthly request quota used purely as a reference
    // point for the "proximity to quota" indicator. It is intentionally a
    // constant (no secret, no external call): teams can adjust it here.
    private const long MonthlyRequestQuota = 1_000_000;

    // Warn once observed monthly volume passes this fraction of the quota.
    private const double WarningRatio = 0.8;

    [HttpGet]
    public async Task<IActionResult> GetUsage([FromQuery] int days = 30, CancellationToken ct = default)
    {
        // Clamp the window to a sane range to keep the aggregation cheap.
        days = Math.Clamp(days, 1, 90);
        var since = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-(days - 1));

        var rows = await db.ApiUsageDaily
            .AsNoTracking()
            .Where(x => x.Date >= since)
            .ToListAsync(ct);

        var total = rows.Sum(x => x.Count);
        var errors4xx = rows.Where(x => x.StatusClass == "4xx").Sum(x => x.Count);
        var errors5xx = rows.Where(x => x.StatusClass == "5xx").Sum(x => x.Count);

        var byDay = rows
            .GroupBy(x => x.Date)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                date = g.Key.ToString("yyyy-MM-dd"),
                total = g.Sum(x => x.Count),
                success = g.Where(x => x.StatusClass is "2xx" or "3xx").Sum(x => x.Count),
                clientErrors = g.Where(x => x.StatusClass == "4xx").Sum(x => x.Count),
                serverErrors = g.Where(x => x.StatusClass == "5xx").Sum(x => x.Count)
            })
            .ToList();

        var byGroup = rows
            .GroupBy(x => x.RouteGroup)
            .Select(g => new
            {
                routeGroup = g.Key,
                total = g.Sum(x => x.Count),
                clientErrors = g.Where(x => x.StatusClass == "4xx").Sum(x => x.Count),
                serverErrors = g.Where(x => x.StatusClass == "5xx").Sum(x => x.Count)
            })
            .OrderByDescending(x => x.total)
            .ToList();

        var byStatusClass = rows
            .GroupBy(x => x.StatusClass)
            .Select(g => new { statusClass = g.Key, total = g.Sum(x => x.Count) })
            .OrderBy(x => x.statusClass)
            .ToList();

        // Quota proximity is computed on the current UTC calendar month so it
        // maps to typical monthly free-tier limits.
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var monthlyUsed = rows.Where(x => x.Date >= monthStart).Sum(x => x.Count);
        var ratio = MonthlyRequestQuota > 0 ? (double)monthlyUsed / MonthlyRequestQuota : 0d;

        var result = new
        {
            windowDays = days,
            totals = new
            {
                requests = total,
                clientErrors = errors4xx,
                serverErrors = errors5xx,
                errorRate = total > 0 ? Math.Round((double)(errors4xx + errors5xx) / total, 4) : 0d
            },
            quota = new
            {
                monthlyQuota = MonthlyRequestQuota,
                monthlyUsed,
                usageRatio = Math.Round(ratio, 4),
                warningRatio = WarningRatio,
                status = ratio >= 1d ? "exceeded" : ratio >= WarningRatio ? "warning" : "ok"
            },
            byDay,
            byGroup,
            byStatusClass
        };

        return Ok(result);
    }
}
