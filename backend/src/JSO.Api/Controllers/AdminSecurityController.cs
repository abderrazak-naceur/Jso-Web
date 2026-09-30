using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Api.Security;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminPermissions.SecurityManage)]
[Route("api/admin/audit")]
public sealed class AdminAuditController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int take = 100, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 250);
        var items = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .ToListAsync(ct);
        return Ok(items);
    }
}

[ApiController]
[Authorize(Policy = AdminPermissions.SecurityManage)]
[Route("api/admin/security")]
public sealed class AdminSecurityController(JsoDbContext db) : ControllerBase
{
    [HttpGet("me/permissions")]
    public IActionResult MyPermissions()
    {
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;

        return Ok(new
        {
            role,
            permissions = role is null ? Array.Empty<string>() : AdminPermissionCatalog.GetPermissions(role)
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken ct) =>
        Ok(await db.AdminUsers.AsNoTracking()
            .OrderBy(x => x.Email)
            .Select(x => new { x.Id, x.Email, x.DisplayName, x.Role, x.IsActive, x.CreatedAt, x.LastLoginAt })
            .ToListAsync(ct));
}
