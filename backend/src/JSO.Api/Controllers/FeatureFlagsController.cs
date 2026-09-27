using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only feature flags endpoint (idea E18).
// Returns ONLY the flags that are Enabled, in a stable shape consumable by both
// the web and Flutter clients so they can gate rendering with a safe fallback.
//
// Only the fields required by clients are exposed (key, enabled, variant,
// rolloutPercent). Internal fields (Id, Description, UpdatedAt) are never
// surfaced here. No personal data is read or stored: RolloutPercent is a
// stateless traffic bucket the client evaluates locally, with no profiling.
[ApiController]
[Route("api/feature-flags")]
public sealed class FeatureFlagsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublic(CancellationToken ct)
    {
        var flags = await db.FeatureFlags.AsNoTracking()
            .Where(x => x.Enabled)
            .OrderBy(x => x.Key)
            .Select(x => new
            {
                key = x.Key,
                enabled = x.Enabled,
                variant = x.Variant,
                rolloutPercent = x.RolloutPercent
            })
            .ToListAsync(ct);

        return Ok(flags);
    }
}
