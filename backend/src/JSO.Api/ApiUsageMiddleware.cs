using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api;

// Lightweight metrics collector for the API usage dashboard (idea E16).
//
// For every request it derives two coarse, non-identifying dimensions and
// increments a daily counter:
//   * RouteGroup  - a normalised route group such as "api/admin",
//                   "api/matches" or "health". Only the first two path
//                   segments are kept and any segment that looks like an id
//                   (guid / number / long token) is dropped, so no raw id
//                   ever reaches storage.
//   * StatusClass - the response status bucket "2xx"/"3xx"/"4xx"/"5xx".
//
// Privacy by design: nothing personal is ever read or stored. No IP address,
// no user id, no query string, no request/response body. Only aggregate
// counts per (UTC day, route group, status class) are persisted.
//
// Resilience: the counter is written on a best-effort basis inside a
// try/catch. If persistence fails for any reason the request pipeline is never
// affected - the response has already been produced and the failure is only
// logged at debug level.
public sealed class ApiUsageMiddleware(RequestDelegate next, ILogger<ApiUsageMiddleware> logger)
{
    // Static free-tier style thresholds are surfaced by the controller; the
    // middleware itself only counts.
    public async Task InvokeAsync(HttpContext context, IServiceScopeFactory scopeFactory)
    {
        try
        {
            await next(context);
        }
        finally
        {
            // Health probes are noisy and carry no product signal; skip them.
            var routeGroup = NormalizeRouteGroup(context.Request.Path);
            if (routeGroup is not null)
            {
                var statusClass = StatusClassOf(context.Response.StatusCode);
                var day = DateOnly.FromDateTime(DateTime.UtcNow);
                // Fire-and-forget style but awaited so the scope lives long
                // enough; wrapped so a failure can never surface to the client.
                await RecordAsync(scopeFactory, day, routeGroup, statusClass, context.RequestAborted);
            }
        }
    }

    private async Task RecordAsync(IServiceScopeFactory scopeFactory, DateOnly day, string routeGroup, string statusClass, CancellationToken ct)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JsoDbContext>();
            var provider = db.Database.ProviderName ?? string.Empty;

            // Use a native atomic upsert for the provider used in production.
            // This avoids the expected-but-noisy duplicate-key race that can
            // occur when several requests create the first counter row at once.
            if (provider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO "ApiUsageDaily" ("Id", "Date", "RouteGroup", "StatusClass", "Count")
                    VALUES ({Guid.NewGuid()}, {day}, {routeGroup}, {statusClass}, 1)
                    ON CONFLICT ("Date", "RouteGroup", "StatusClass")
                    DO UPDATE SET "Count" = "ApiUsageDaily"."Count" + 1;
                    """, ct);
                return;
            }

            if (provider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    UPDATE [ApiUsageDaily] WITH (UPDLOCK, HOLDLOCK)
                    SET [Count] = [Count] + 1
                    WHERE [Date] = {day}
                      AND [RouteGroup] = {routeGroup}
                      AND [StatusClass] = {statusClass};

                    IF @@ROWCOUNT = 0
                    BEGIN
                        INSERT INTO [ApiUsageDaily] ([Id], [Date], [RouteGroup], [StatusClass], [Count])
                        VALUES ({Guid.NewGuid()}, {day}, {routeGroup}, {statusClass}, 1);
                    END
                    """, ct);
                await transaction.CommitAsync(ct);
                return;
            }

            // Portable fallback for providers not explicitly supported above.
            var updated = await db.ApiUsageDaily
                .Where(x => x.Date == day && x.RouteGroup == routeGroup && x.StatusClass == statusClass)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Count, x => x.Count + 1), ct);

            if (updated > 0)
                return;

            db.ApiUsageDaily.Add(new ApiUsageDaily
            {
                Date = day,
                RouteGroup = routeGroup,
                StatusClass = statusClass,
                Count = 1
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            // Never let metrics collection affect the request.
            logger.LogDebug(ex, "API usage counter update failed for {RouteGroup} {StatusClass}", routeGroup, statusClass);
        }
    }

    // Returns a coarse route group with no raw ids, or null to skip counting.
    internal static string? NormalizeRouteGroup(PathString path)
    {
        if (!path.HasValue)
            return "other";

        var value = path.Value!;
        var segments = value.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0)
            return "root";

        // Health checks and static uploads are not product API usage.
        if (segments[0].Equals("health", StringComparison.OrdinalIgnoreCase))
            return null;
        if (segments[0].Equals("uploads", StringComparison.OrdinalIgnoreCase))
            return null;

        // Keep at most the first two non-id segments so the group stays coarse
        // (e.g. "api/admin", "api/matches") and never leaks an entity id.
        var kept = new List<string>(2);
        foreach (var segment in segments)
        {
            if (LooksLikeId(segment))
                continue;
            kept.Add(segment.ToLowerInvariant());
            if (kept.Count == 2)
                break;
        }

        return kept.Count == 0 ? "other" : string.Join('/', kept);
    }

    // A segment is treated as an id (and dropped) when it is a guid, a number
    // or a long opaque token, so that route groups never contain raw ids.
    private static bool LooksLikeId(string segment)
    {
        if (Guid.TryParse(segment, out _))
            return true;
        if (long.TryParse(segment, out _))
            return true;
        if (segment.Length >= 24 && !segment.Contains('-'))
            return true;
        return false;
    }

    internal static string StatusClassOf(int statusCode) => statusCode switch
    {
        >= 500 => "5xx",
        >= 400 => "4xx",
        >= 300 => "3xx",
        _ => "2xx"
    };
}
