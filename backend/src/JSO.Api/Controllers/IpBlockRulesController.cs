using System.Net;
using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/security/ip-blocks")]
[Authorize(Roles = "SuperAdmin")]
public sealed class IpBlockRulesController(JsoDbContext db) : ControllerBase
{
    public sealed record CreateRuleRequest(string? NetworkCidr, string? Reason, DateTimeOffset? ExpiresAt);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var rules = await db.IpBlockRules.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.NetworkCidr, x.Reason, x.CreatedBy, x.CreatedAt, x.ExpiresAt, x.IsEnabled,
                IsExpired = x.ExpiresAt != null && x.ExpiresAt <= now })
            .ToListAsync(ct);
        return Ok(new { enforcementEnabled = false, rules });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleRequest request, CancellationToken ct)
    {
        var cidr = request.NetworkCidr?.Trim();
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(cidr) || cidr.Length > 64 || !IsValidCidr(cidr))
            return BadRequest(new { message = "Fornire un indirizzo IP o una rete CIDR valida." });
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500)
            return BadRequest(new { message = "La motivazione è obbligatoria e non può superare 500 caratteri." });
        if (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTimeOffset.UtcNow)
            return BadRequest(new { message = "La scadenza deve essere nel futuro." });

        var normalized = NormalizeCidr(cidr);
        var exists = await db.IpBlockRules.AnyAsync(x => x.NetworkCidr == normalized && x.IsEnabled &&
            (x.ExpiresAt == null || x.ExpiresAt > DateTimeOffset.UtcNow), ct);
        if (exists) return Conflict(new { message = "Una regola attiva per questa rete esiste già." });

        var rule = new IpBlockRule
        {
            NetworkCidr = normalized,
            Reason = reason,
            CreatedBy = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "SuperAdmin",
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = request.ExpiresAt,
            IsEnabled = true
        };
        db.IpBlockRules.Add(rule);
        await db.SaveChangesAsync(ct);
        return Ok(new { rule.Id, rule.NetworkCidr, rule.Reason, rule.CreatedAt, rule.ExpiresAt, rule.IsEnabled, enforcementEnabled = false });
    }

    [HttpPatch("{id:guid}/disable")]
    public async Task<IActionResult> Disable(Guid id, CancellationToken ct)
    {
        var rule = await db.IpBlockRules.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (rule is null) return NotFound();
        rule.IsEnabled = false;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpGet("~/api/admin/security/traffic-events")]
    public async Task<IActionResult> Events([FromQuery] int limit = 100, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit, 1, 250);
        var events = await db.SecurityTrafficEvents.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt).Take(limit)
            .Select(x => new { x.Id, x.CreatedAt, x.Category, x.Severity, x.Signal, x.Path, x.ClientAddress, x.UserAgentFamily, x.VerifiedBot })
            .ToListAsync(ct);
        return Ok(new { detectionMode = "signals-only", events });
    }

    private static bool IsValidCidr(string value)
    {
        var parts = value.Split('/', StringSplitOptions.TrimEntries);
        if (parts.Length > 2 || !IPAddress.TryParse(parts[0], out var address)) return false;
        if (parts.Length == 1) return true;
        if (!int.TryParse(parts[1], out var prefix)) return false;
        var max = address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128;
        return prefix >= 0 && prefix <= max;
    }

    private static string NormalizeCidr(string value)
    {
        var parts = value.Split('/', StringSplitOptions.TrimEntries);
        var address = IPAddress.Parse(parts[0]).ToString().ToLowerInvariant();
        return parts.Length == 1 ? address : address + "/" + int.Parse(parts[1]);
    }
}
