using System.Collections.Concurrent;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Security;

/// <summary>
/// Emits low-confidence automation signals only. User-Agent strings are spoofable,
/// so this middleware never blocks requests and never labels a client as a verified bot.
/// </summary>
public sealed class SuspiciousTrafficMiddleware(RequestDelegate next, ILogger<SuspiciousTrafficMiddleware> logger)
{
    private static readonly ConcurrentDictionary<string, DateTimeOffset> LastRecorded = new();
    private static readonly TimeSpan DeduplicationWindow = TimeSpan.FromMinutes(15);
    private static int _lastCleanupDay;

    public async Task InvokeAsync(HttpContext context)
    {
        await TryCleanupOldEventsAsync(context);

        var userAgent = context.Request.Headers.UserAgent.ToString();
        var family = GetAutomationFamily(userAgent);
        if (family is not null && IsPubliclyRelevantPath(context.Request.Path))
        {
            var normalizedPath = NormalizePath(context.Request.Path);
            var key = family + "|" + normalizedPath;
            var now = DateTimeOffset.UtcNow;
            if (!LastRecorded.TryGetValue(key, out var last) || now - last >= DeduplicationWindow)
            {
                LastRecorded[key] = now;
                if (LastRecorded.Count > 5000)
                {
                    var expiredBefore = now - DeduplicationWindow;
                    foreach (var entry in LastRecorded)
                        if (entry.Value < expiredBefore) LastRecorded.TryRemove(entry.Key, out _);
                }
                try
                {
                    await using var scope = context.RequestServices.CreateAsyncScope();
                    var db = scope.ServiceProvider.GetRequiredService<JsoDbContext>();
                    db.SecurityTrafficEvents.Add(new SecurityTrafficEvent
                    {
                        CreatedAt = now,
                        Category = "automation-signal",
                        Severity = "low",
                        Signal = $"User-Agent suggests automated client ({family}); not verified",
                        Path = normalizedPath,
                        ClientAddress = null,
                        UserAgentFamily = family,
                        VerifiedBot = false
                    });
                    await db.SaveChangesAsync(context.RequestAborted);
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Could not persist low-confidence automation signal.");
                }
            }
        }

        await next(context);
    }

    private async Task TryCleanupOldEventsAsync(HttpContext context)
    {
        // Keep detailed security signals for at most 30 days. Run at most once
        // per UTC day per process; cleanup failure must never interrupt requests.
        var now = DateTimeOffset.UtcNow;
        var today = now.Year * 1000 + now.DayOfYear;
        if (Interlocked.Exchange(ref _lastCleanupDay, today) == today)
            return;

        try
        {
            await using var scope = context.RequestServices.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<JsoDbContext>();
            var cutoff = now.AddDays(-30);
            await db.SecurityTrafficEvents
                .Where(x => x.CreatedAt < cutoff)
                .ExecuteDeleteAsync(context.RequestAborted);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not apply 30-day security-event retention cleanup; it will be retried on the next UTC day.");
        }
    }

    private static string? GetAutomationFamily(string userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent) || userAgent.Length > 1024) return null;
        var value = userAgent.ToLowerInvariant();
        if (value.Contains("headlesschrome") || value.Contains("playwright") || value.Contains("puppeteer") || value.Contains("selenium"))
            return "headless-browser";
        if (value.Contains("scrapy") || value.Contains("python-requests") || value.Contains("httpx/") || value.Contains("aiohttp"))
            return "script-client";
        if (value.StartsWith("curl/") || value.StartsWith("wget/"))
            return "command-line-client";
        if (value.Contains("googlebot") || value.Contains("bingbot") || value.Contains("duckduckbot"))
            return "claimed-search-crawler";
        return null;
    }

    private static bool IsPubliclyRelevantPath(PathString path)
    {
        var value = path.Value ?? "/";
        return !value.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("/api/analytics", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizePath(PathString path)
    {
        var segments = (path.Value ?? "/").Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => Guid.TryParse(segment, out _) || long.TryParse(segment, out _) || segment.Length > 48 ? ":id" : segment);
        var normalized = "/" + string.Join("/", segments);
        return normalized.Length > 300 ? normalized[..300] : normalized;
    }
}
