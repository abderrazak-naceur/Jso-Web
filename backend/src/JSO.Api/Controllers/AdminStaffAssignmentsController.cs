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

        var adminExists = await db.AdminUsers.AnyAsync(x => x.Id == request.AdminUserId, ct);
        if (!adminExists)
            return BadRequest(new { message = "Admin user not found." });

        var assignment = new StaffAssignment
        {
            AdminUserId = request.AdminUserId,
            Role = request.Role.Trim(),
            ScopeType = string.IsNullOrWhiteSpace(request.ScopeType) ? "Global" : request.ScopeType.Trim(),
            ScopeId = string.IsNullOrWhiteSpace(request.ScopeId) ? null : request.ScopeId.Trim(),
            GateId = string.IsNullOrWhiteSpace(request.GateId) ? null : request.GateId.Trim(),
            DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? null : request.DeviceId.Trim(),
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
