using System.Security.Claims;
using JSO.Api.Security;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/tickets/scan")]
public sealed class AdminTicketScanController(
    JsoDbContext db,
    AuditService audit,
    StaffAuthorizationService staffAuthorization) : ControllerBase
{
    [HttpGet("configuration")]
    public async Task<IActionResult> Configuration(CancellationToken ct)
    {
        var adminId = CurrentAdminId();
        if (adminId is null)
            return Unauthorized();

        var user = await db.AdminUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == adminId.Value && x.IsActive, ct);
        if (user is null)
            return Forbid();

        var assignments = await db.StaffAssignments.AsNoTracking()
            .Where(x => x.AdminUserId == adminId.Value && x.IsActive)
            .ToListAsync(ct);

        var now = DateTimeOffset.UtcNow;
        var activeAssignments = assignments.Where(x =>
            (!x.ValidFrom.HasValue || x.ValidFrom.Value <= now) &&
            (!x.ValidTo.HasValue || x.ValidTo.Value >= now) &&
            (AdminPermissionCatalog.HasPermission(x.Role, AdminPermissions.TicketsValidate) ||
             AdminPermissionCatalog.HasPermission(x.Role, AdminPermissions.TicketsCheckIn)))
            .ToList();

        var hasGlobal = activeAssignments.Any(x =>
            x.ScopeType.Equals("Global", StringComparison.OrdinalIgnoreCase));

        var gateCodes = activeAssignments
            .Where(x => x.GateId is not null)
            .Select(x => x.GateId!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var deviceCodes = activeAssignments
            .Where(x => x.DeviceId is not null)
            .Select(x => x.DeviceId!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var gatesQuery = db.Gates.AsNoTracking().Where(x => x.IsActive);
        var devicesQuery = db.ScannerDevices.AsNoTracking().Where(x => x.IsActive);

        if (!hasGlobal)
        {
            if (gateCodes.Count > 0)
                gatesQuery = gatesQuery.Where(x => gateCodes.Contains(x.Code));
            else if (deviceCodes.Count > 0)
            {
                var allowedGateIds = await db.ScannerDevices.AsNoTracking()
                    .Where(x => x.IsActive && deviceCodes.Contains(x.DeviceCode) && x.GateId.HasValue)
                    .Select(x => x.GateId!.Value)
                    .ToListAsync(ct);
                gatesQuery = gatesQuery.Where(x => allowedGateIds.Contains(x.Id));
            }
            else
            {
                return Ok(new { gates = Array.Empty<object>(), devices = Array.Empty<object>() });
            }

            if (deviceCodes.Count > 0)
                devicesQuery = devicesQuery.Where(x => deviceCodes.Contains(x.DeviceCode));
            else if (gateCodes.Count > 0)
                devicesQuery = devicesQuery.Where(x => x.GateId.HasValue &&
                    db.Gates.Any(g => g.Id == x.GateId.Value && gateCodes.Contains(g.Code)));
            else
                devicesQuery = devicesQuery.Where(x => false);
        }

        var gates = await gatesQuery
            .OrderBy(x => x.Code)
            .Select(x => new { x.Id, x.Code, x.Name, x.FacilityId })
            .ToListAsync(ct);

        var devices = await devicesQuery
            .OrderBy(x => x.DeviceCode)
            .Select(x => new { x.Id, x.DeviceCode, x.Name, x.GateId })
            .ToListAsync(ct);

        return Ok(new { gates, devices });
    }

    [HttpGet("matches")]
    public async Task<IActionResult> Matches(CancellationToken ct)
    {
        var adminId = CurrentAdminId();
        if (adminId is null) return Unauthorized();

        var user = await db.AdminUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == adminId.Value && x.IsActive, ct);
        if (user is null) return Forbid();

        var now = DateTimeOffset.UtcNow;
        var assignments = await db.StaffAssignments.AsNoTracking()
            .Where(x => x.AdminUserId == adminId.Value && x.IsActive)
            .ToListAsync(ct);

        var active = assignments.Where(x =>
            (!x.ValidFrom.HasValue || x.ValidFrom.Value <= now) &&
            (!x.ValidTo.HasValue || x.ValidTo.Value >= now) &&
            (AdminPermissionCatalog.HasPermission(x.Role, AdminPermissions.TicketsValidate) ||
             AdminPermissionCatalog.HasPermission(x.Role, AdminPermissions.TicketsCheckIn)))
            .ToList();

        var hasGlobal = active.Any(x => x.ScopeType.Equals("Global", StringComparison.OrdinalIgnoreCase));
        var matchIds = active
            .Where(x => x.ScopeType.Equals("Match", StringComparison.OrdinalIgnoreCase))
            .Select(x => x.ScopeId)
            .Where(x => Guid.TryParse(x, out _))
            .Select(x => Guid.Parse(x!))
            .ToHashSet();

        var query = db.Matches.AsNoTracking()
            .Where(x => x.KickoffAt >= now.AddHours(-12));

        if (!hasGlobal)
        {
            if (matchIds.Count == 0)
                return Ok(Array.Empty<object>());
            query = query.Where(x => matchIds.Contains(x.Id));
        }

        var matches = await query
            .OrderBy(x => x.KickoffAt)
            .Take(50)
            .Select(x => new
            {
                x.Id,
                x.KickoffAt,
                x.OpponentName,
                x.Venue,
                x.IsHome,
                x.Status,
                x.IsPublished
            })
            .ToListAsync(ct);

        return Ok(matches);
    }

    [HttpPost("validate")]
    [EnableRateLimiting("ticket-scan")]
    public async Task<IActionResult> Validate(StaffTicketScanRequest request, CancellationToken ct)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token requis." });

        var order = await db.TicketOrders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PublicTicketToken == token, ct);

        var authorization = await AuthorizeScanAsync(order, request, AdminPermissions.TicketsValidate, ct);
        if (!authorization.Allowed)
            return authorization.Response!;

        var (result, message) = Evaluate(order, request.MatchId);
        await LogScanAsync("TICKET_VALIDATED", result, order, request, ct);
        return Ok(BuildResponse(result, message, order));
    }

    [HttpPost("check-in")]
    [EnableRateLimiting("ticket-scan")]
    public async Task<IActionResult> CheckIn(StaffTicketScanRequest request, CancellationToken ct)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Token requis." });

        var order = await db.TicketOrders
            .SingleOrDefaultAsync(x => x.PublicTicketToken == token, ct);

        var authorization = await AuthorizeScanAsync(order, request, AdminPermissions.TicketsCheckIn, ct);
        if (!authorization.Allowed)
            return authorization.Response!;

        var (preResult, preMessage) = Evaluate(order, request.MatchId);
        if (preResult != "Valid")
            return await FinishAsync(preResult, preMessage, order, request, ct);

        var adminId = CurrentAdminId();
        var checkedInAt = DateTimeOffset.UtcNow;
        var affected = await db.TicketOrders
            .Where(x => x.PublicTicketToken == token
                && x.Status == "Confirmed"
                && (request.MatchId == null || x.MatchId == request.MatchId))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, "CheckedIn")
                .SetProperty(x => x.CheckedInAt, checkedInAt)
                .SetProperty(x => x.CheckedInByAdminId, adminId!.Value.ToString()), ct);

        if (affected == 1)
        {
            order!.Status = "CheckedIn";
            order.CheckedInAt = checkedInAt;
            order.CheckedInByAdminId = adminId?.ToString();
            return await FinishAsync("Valid", preMessage, order, request, ct);
        }

        var current = await db.TicketOrders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PublicTicketToken == token, ct);
        var (result, message) = Evaluate(current, request.MatchId);
        return await FinishAsync(result, message, current, request, ct);
    }

    private async Task<(bool Allowed, IActionResult? Response)> AuthorizeScanAsync(
        TicketOrder? order,
        StaffTicketScanRequest request,
        string permission,
        CancellationToken ct)
    {
        var adminId = CurrentAdminId();
        if (adminId is null)
            return (false, Unauthorized());

        if (order is null)
            return (false, Forbid());

        var scopeId = order.MatchId.ToString();
        var assignments = await db.StaffAssignments.AsNoTracking()
            .Where(x => x.AdminUserId == adminId.Value)
            .ToListAsync(ct);

        var user = await db.AdminUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == adminId.Value && x.IsActive, ct);
        if (user is null)
            return (false, Forbid());

        var allowed = staffAuthorization.CanAccess(
            user,
            assignments,
            permission,
            scopeType: "Match",
            scopeId: scopeId,
            gateId: request.GateId,
            deviceId: request.DeviceId);

        return allowed ? (true, null) : (false, Forbid());
    }

    private async Task<IActionResult> FinishAsync(
        string result,
        string message,
        TicketOrder? order,
        StaffTicketScanRequest request,
        CancellationToken ct)
    {
        var adminId = CurrentAdminId()?.ToString();
        db.TicketCheckIns.Add(new TicketCheckIn
        {
            TicketOrderId = order?.Id,
            MatchId = order?.MatchId ?? request.MatchId,
            CheckedInByAdminId = adminId,
            DeviceId = request.DeviceId,
            Result = result
        });
        await db.SaveChangesAsync(ct);

        await LogScanAsync("TICKET_" + result.ToUpperInvariant(), result, order, request, ct);
        return Ok(BuildResponse(result, result switch
        {
            "Valid" => "Billet valide.",
            "AlreadyUsed" => "Billet déjà utilisé.",
            "Cancelled" => "Billet annulé.",
            "WrongMatch" => "Billet pour un autre match.",
            _ => "Billet non valide."
        }, order));
    }

    private async Task LogScanAsync(
        string action,
        string result,
        TicketOrder? order,
        StaffTicketScanRequest request,
        CancellationToken ct)
    {
        await audit.LogAsync(
            action,
            "TicketOrder",
            order?.Id.ToString(),
            CurrentAdminId()?.ToString(),
            User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new
            {
                matchId = order?.MatchId ?? request.MatchId,
                gateId = request.GateId,
                deviceId = request.DeviceId,
                tokenPrefix = TokenPrefix(request.Token ?? string.Empty),
                result
            },
            ct);
    }

    private Guid? CurrentAdminId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private static (string Result, string Message) Evaluate(TicketOrder? order, Guid? matchId)
    {
        if (order is null) return ("Invalid", "Billet introuvable.");
        if (order.Status == "CheckedIn") return ("AlreadyUsed", "Billet déjà utilisé.");
        if (order.Status == "Cancelled") return ("Cancelled", "Billet annulé.");
        if (order.Status != "Confirmed") return ("Invalid", "Billet non valide.");
        if (matchId is not null && matchId != order.MatchId) return ("WrongMatch", "Billet pour un autre match.");
        return ("Valid", "Billet valide.");
    }

    private static object BuildResponse(string result, string message, TicketOrder? order) => new
    {
        result,
        message,
        ticket = order is null ? null : new
        {
            order.Id,
            order.MatchId,
            order.TicketTypeName,
            order.Quantity,
            order.Status,
            order.CheckedInAt
        }
    };

    private static string TokenPrefix(string token) =>
        token[..Math.Min(6, token.Length)] + "…";
}

public sealed record StaffTicketScanRequest(
    string? Token,
    Guid? MatchId,
    string? DeviceId,
    string? GateId = null);
