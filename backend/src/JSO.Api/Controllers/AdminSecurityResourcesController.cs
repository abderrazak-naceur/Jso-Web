using JSO.Api.Security;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

public sealed record GateRequest(Guid? FacilityId, string Code, string Name, bool IsActive = true);
public sealed record ScannerDeviceRequest(Guid? GateId, string DeviceCode, string Name, bool IsActive = true);

[ApiController]
[Authorize(Policy = AdminPermissions.SecurityManage)]
[Route("api/admin/security")]
public sealed class AdminSecurityResourcesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("gates")]
    public async Task<IActionResult> Gates(CancellationToken ct) =>
        Ok(await db.Gates.AsNoTracking().OrderBy(x => x.Code).ToListAsync(ct));

    [HttpPost("gates")]
    public async Task<IActionResult> CreateGate(GateRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Gate code and name are required." });
        if (request.FacilityId.HasValue && !await db.Facilities.AnyAsync(x => x.Id == request.FacilityId && x.IsActive, ct))
            return BadRequest(new { message = "Facility not found or inactive." });
        var code = request.Code.Trim();
        if (await db.Gates.AnyAsync(x => x.Code == code && x.FacilityId == request.FacilityId, ct))
            return Conflict(new { message = "A gate with this code already exists for the facility." });
        var gate = new Gate { FacilityId = request.FacilityId, Code = code, Name = request.Name.Trim(), IsActive = request.IsActive };
        db.Gates.Add(gate);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Gate", gate.Id.ToString(), User.FindFirst("sub")?.Value, User.Identity?.Name, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Created($"/api/admin/security/gates/{gate.Id}", gate);
    }

    [HttpGet("devices")]
    public async Task<IActionResult> Devices(CancellationToken ct) =>
        Ok(await db.ScannerDevices.AsNoTracking().OrderBy(x => x.DeviceCode).ToListAsync(ct));

    [HttpPost("devices")]
    public async Task<IActionResult> CreateDevice(ScannerDeviceRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DeviceCode) || string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Device code and name are required." });
        if (request.GateId.HasValue && !await db.Gates.AnyAsync(x => x.Id == request.GateId && x.IsActive, ct))
            return BadRequest(new { message = "Gate not found or inactive." });
        var code = request.DeviceCode.Trim();
        if (await db.ScannerDevices.AnyAsync(x => x.DeviceCode == code, ct))
            return Conflict(new { message = "A device with this code already exists." });
        var device = new ScannerDevice { GateId = request.GateId, DeviceCode = code, Name = request.Name.Trim(), IsActive = request.IsActive };
        db.ScannerDevices.Add(device);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ScannerDevice", device.Id.ToString(), User.FindFirst("sub")?.Value, User.Identity?.Name, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Created($"/api/admin/security/devices/{device.Id}", device);
    }
}