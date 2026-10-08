using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management for feature flags and lightweight A/B testing (idea E18).
// Every route requires the SuperAdmin or ClubAdmin role and every write is
// audited. Flags can be created, updated, deleted and toggled without a
// release; only Enabled flags are surfaced on the public endpoint.
//
// Validation: Key is required, trimmed and unique; RolloutPercent, when set,
// must be within 0..100. Privacy: no personal profiling is performed and no
// personal data is stored here.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/feature-flags")]
public sealed class AdminFeatureFlagsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // Full list, newest changes first, so admins see the complete record
    // including disabled flags and internal metadata.
    [HttpGet]
    public async Task<IActionResult> GetFlags(CancellationToken ct)
    {
        var rows = await db.FeatureFlags.AsNoTracking()
            .OrderByDescending(x => x.UpdatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateFlag(FeatureFlagRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var key = request.Key.Trim();
        if (await db.FeatureFlags.AnyAsync(x => x.Key == key, ct))
            return BadRequest(new { message = "A feature flag with this key already exists." });

        var flag = new FeatureFlag
        {
            Key = key,
            Enabled = request.Enabled,
            Variant = string.IsNullOrWhiteSpace(request.Variant) ? null : request.Variant.Trim(),
            RolloutPercent = request.RolloutPercent,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.FeatureFlags.Add(flag);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "FeatureFlag", flag.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { flag.Key, flag.Enabled, flag.Variant, flag.RolloutPercent }, ct);
        return Created($"/api/admin/feature-flags/{flag.Id}", flag);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateFlag(Guid id, FeatureFlagRequest request, CancellationToken ct)
    {
        var flag = await db.FeatureFlags.FindAsync([id], ct);
        if (flag is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var key = request.Key.Trim();
        if (await db.FeatureFlags.AnyAsync(x => x.Key == key && x.Id != id, ct))
            return BadRequest(new { message = "A feature flag with this key already exists." });

        flag.Key = key;
        flag.Enabled = request.Enabled;
        flag.Variant = string.IsNullOrWhiteSpace(request.Variant) ? null : request.Variant.Trim();
        flag.RolloutPercent = request.RolloutPercent;
        flag.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        flag.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "FeatureFlag", flag.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { flag.Key, flag.Enabled, flag.Variant, flag.RolloutPercent }, ct);
        return Ok(flag);
    }

    // Quick on/off switch without editing the rest of the flag.
    [HttpPost("{id:guid}/toggle")]
    public async Task<IActionResult> ToggleFlag(Guid id, CancellationToken ct)
    {
        var flag = await db.FeatureFlags.FindAsync([id], ct);
        if (flag is null) return NotFound();
        flag.Enabled = !flag.Enabled;
        flag.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("TOGGLE", "FeatureFlag", flag.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { flag.Key, flag.Enabled }, ct);
        return Ok(flag);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFlag(Guid id, CancellationToken ct)
    {
        var flag = await db.FeatureFlags.FindAsync([id], ct);
        if (flag is null) return NotFound();
        db.FeatureFlags.Remove(flag);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "FeatureFlag", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(FeatureFlagRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Key)) return "Key is required.";
        if (r.Key.Trim().Length > 120) return "Key must be 120 characters or fewer.";
        if (r.Variant is not null && r.Variant.Trim().Length > 60) return "Variant must be 60 characters or fewer.";
        if (r.Description is not null && r.Description.Trim().Length > 500) return "Description must be 500 characters or fewer.";
        if (r.RolloutPercent is < 0 or > 100) return "Rollout percent must be between 0 and 100.";
        return null;
    }
}

public sealed record FeatureFlagRequest(
    string Key,
    bool Enabled = false,
    string? Variant = null,
    int? RolloutPercent = null,
    string? Description = null);
