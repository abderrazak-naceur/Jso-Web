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
                .SetProperty(x => x.CheckedInByAdminId, adminId), ct);

        if (affected == 1)
        {
            order.Status = "CheckedIn";
            order.CheckedInAt = checkedInAt;
            order.CheckedInByAdminId = adminId;
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
