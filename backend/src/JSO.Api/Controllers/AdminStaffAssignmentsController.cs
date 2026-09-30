using JSO.Api.Security;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record StaffAssignmentRequest(
    Guid AdminUserId,
    string Role,
    string ScopeType,
    string? ScopeId,
    string? GateId,
    string? DeviceId,
    bool IsActive,
    DateTimeOffset? ValidFrom,
    DateTimeOffset? ValidTo);

[ApiController]
[Authorize(Policy = AdminPermissions.SecurityManage)]
[Route("api/admin/security/staff-assignments")]
public sealed class AdminStaffAssignmentsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "SuperAdmin", "ClubAdmin", "MatchManager", "FinanceManager", "ShopManager",
        "Editor", "CommunityManager", "TicketSeller", "TicketValidator",
        "TicketSupervisor", "SeasonManager"
    };

    private static readonly HashSet<string> AllowedScopes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Global", "Club", "Team", "Match", "Venue", "Gate"
    };

    [HttpGet("references")]
    public async Task<IActionResult> References(CancellationToken ct)
    {
        var matches = await db.Matches.AsNoTracking()
            .OrderByDescending(x => x.KickoffAt)
            .Take(100)
            .Select(x => new { x.Id, x.OpponentName, x.KickoffAt, x.Venue, x.IsHome })
            .ToListAsync(ct);

        var teams = await db.Teams.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.Category })
            .ToListAsync(ct);

        var facilities = await db.Facilities.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Name)
            .Select(x => new { x.Id, x.Name, x.Type })
            .ToListAsync(ct);

        return Ok(new { matches, teams, facilities });
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] Guid? adminUserId, CancellationToken ct)
    {
        var query = db.StaffAssignments.AsNoTracking().AsQueryable();
        if (adminUserId.HasValue)
            query = query.Where(x => x.AdminUserId == adminUserId.Value);

        return Ok(await query.OrderBy(x => x.Role).ThenBy(x => x.ScopeType).ThenBy(x => x.CreatedAt).ToListAsync(ct));
    }

    [HttpPost]
    public async Task<IActionResult> Create(StaffAssignmentRequest request, CancellationToken ct)
    {
        if (request.ValidFrom.HasValue && request.ValidTo.HasValue && request.ValidTo < request.ValidFrom)
            return BadRequest(new { message = "ValidTo must be greater than or equal to ValidFrom." });

        var role = request.Role?.Trim() ?? string.Empty;
        var scopeType = string.IsNullOrWhiteSpace(request.ScopeType) ? "Global" : request.ScopeType.Trim();
        var scopeId = string.IsNullOrWhiteSpace(request.ScopeId) ? null : request.ScopeId.Trim();
        var gateId = string.IsNullOrWhiteSpace(request.GateId) ? null : request.GateId.Trim();
        var deviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? null : request.DeviceId.Trim();

        if (!AllowedRoles.Contains(role))
            return BadRequest(new { message = $"Unsupported staff role: {role}." });

        if (!AllowedScopes.Contains(scopeType))
            return BadRequest(new { message = $"Unsupported scope type: {scopeType}." });

        if (scopeType.Equals("Global", StringComparison.OrdinalIgnoreCase) &&
            (scopeId is not null || gateId is not null || deviceId is not null))
            return BadRequest(new { message = "Global assignments cannot specify scope, gate, or device." });

        if (!scopeType.Equals("Global", StringComparison.OrdinalIgnoreCase) && scopeId is null)
            return BadRequest(new { message = $"ScopeId is required for {scopeType} assignments." });

        if (scopeType.Equals("Gate", StringComparison.OrdinalIgnoreCase) && gateId is null)
            return BadRequest(new { message = "GateId is required for Gate assignments." });

        if (scopeId is not null && Guid.TryParse(scopeId, out var scopeGuid))
        {
            var scopeExists = scopeType.ToLowerInvariant() switch
            {
                "club" => await db.Clubs.AnyAsync(x => x.Id == scopeGuid, ct),
                "team" => await db.Teams.AnyAsync(x => x.Id == scopeGuid && x.IsActive, ct),
                "match" => await db.Matches.AnyAsync(x => x.Id == scopeGuid, ct),
                "venue" => await db.Facilities.AnyAsync(x => x.Id == scopeGuid && x.IsActive, ct),
                _ => true
            };

            if (!scopeExists)
                return BadRequest(new { message = $"Scope resource not found or inactive for {scopeType}." });
        }

        var adminExists = await db.AdminUsers.AnyAsync(x => x.Id == request.AdminUserId, ct);
        if (!adminExists)
            return BadRequest(new { message = "Admin user not found." });

        var assignment = new StaffAssignment
        {
            AdminUserId = request.AdminUserId,
            Role = role,
            ScopeType = scopeType,
            ScopeId = scopeId,
            GateId = gateId,
            DeviceId = deviceId,
            IsActive = request.IsActive,
            ValidFrom = request.ValidFrom,
            ValidTo = request.ValidTo
        };

        db.StaffAssignments.Add(assignment);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(
            "CREATE",
            "StaffAssignment",
            assignment.Id.ToString(),
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            User.Identity?.Name,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct: ct);

        return CreatedAtAction(nameof(Get), new { adminUserId = assignment.AdminUserId }, assignment);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var assignment = await db.StaffAssignments.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (assignment is null)
            return NotFound();

        assignment.IsActive = false;
        assignment.ValidTo ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(
            "DEACTIVATE",
            "StaffAssignment",
            assignment.Id.ToString(),
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            User.Identity?.Name,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            ct: ct);

        return NoContent();
    }
}
