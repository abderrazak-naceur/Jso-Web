using System.Net;
using System.Net.Sockets;
using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Security;

/// <summary>
/// Optional CIDR enforcement. It is intentionally off unless both explicit
/// configuration flags are true after the hosting proxy chain has been verified.
/// </summary>
public sealed class IpBlockEnforcementMiddleware(RequestDelegate next, IConfiguration configuration, ILogger<IpBlockEnforcementMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, JsoDbContext db)
    {
        var enabled = configuration.GetValue<bool>("Security:TrustedClientIpVerified")
            && configuration.GetValue<bool>("Security:IpBlockEnforcementEnabled");
        if (!enabled || context.Request.Path.StartsWithSegments("/api/admin/security/ip-blocks"))
        {
            await next(context);
            return;
        }

        var clientIp = context.Connection.RemoteIpAddress;
        if (clientIp is null)
        {
            logger.LogWarning("IP enforcement is enabled but the request has no resolved client IP; request is not blocked.");
            await next(context);
            return;
        }

        if (clientIp.IsIPv4MappedToIPv6) clientIp = clientIp.MapToIPv4();
        var now = DateTimeOffset.UtcNow;
        var rules = await db.IpBlockRules.AsNoTracking()
            .Where(x => x.IsEnabled && (x.ExpiresAt == null || x.ExpiresAt > now))
            .Select(x => x.NetworkCidr)
            .ToListAsync(context.RequestAborted);

        foreach (var rule in rules)
        {
            if (!Matches(clientIp, rule)) continue;
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsJsonAsync(new
            {
                title = "Access denied",
                status = StatusCodes.Status403Forbidden,
                detail = "This client network is blocked by the site security policy."
            }, context.RequestAborted);
            return;
        }

        await next(context);
    }

    private static bool Matches(IPAddress address, string cidr)
    {
        var parts = cidr.Split('/', StringSplitOptions.TrimEntries);
        if (!IPAddress.TryParse(parts[0], out var network)) return false;
        if (address.IsIPv4MappedToIPv6) address = address.MapToIPv4();
        if (network.IsIPv4MappedToIPv6) network = network.MapToIPv4();
        if (address.AddressFamily != network.AddressFamily) return false;

        var maxBits = address.AddressFamily == AddressFamily.InterNetwork ? 32 : 128;
        var prefix = parts.Length == 1 ? maxBits : int.TryParse(parts[1], out var parsed) ? parsed : -1;
        if (prefix < 0 || prefix > maxBits) return false;
        var addressBytes = address.GetAddressBytes();
        var networkBytes = network.GetAddressBytes();
        var fullBytes = prefix / 8;
        var remainingBits = prefix % 8;
        for (var i = 0; i < fullBytes; i++)
            if (addressBytes[i] != networkBytes[i]) return false;
        if (remainingBits == 0) return true;
        var mask = (byte)(0xff << (8 - remainingBits));
        return (addressBytes[fullBytes] & mask) == (networkBytes[fullBytes] & mask);
    }
}
