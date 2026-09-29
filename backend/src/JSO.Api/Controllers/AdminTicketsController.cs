using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin ticketing: manage ticket types per match and confirm/cancel fan ticket
// orders (manual gateway). Confirming a Pending order increments the ticket
// type's SoldCount inside a transaction and is idempotent.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,MatchManager")]
[Route("api/admin/tickets")]
public sealed class AdminTicketsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("types")]
    public async Task<IActionResult> GetTypes([FromQuery] Guid? matchId, CancellationToken ct)
    {
        var query = db.TicketTypes.AsNoTracking();
        if (matchId is not null) query = query.Where(x => x.MatchId == matchId);
        return Ok(await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }

    [HttpPost("types")]
    public async Task<IActionResult> CreateType(TicketTypeRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });
        if (!await db.Matches.AnyAsync(x => x.Id == request.MatchId, ct))
            return BadRequest(new { message = "Unknown match." });

        var type = new TicketType
        {
            MatchId = request.MatchId,
            Name = request.Name.Trim(),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant(),
            Capacity = request.Capacity,
            IsActive = request.IsActive
        };
        db.TicketTypes.Add(type);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "TicketType", type.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { type.MatchId, type.Price }, ct);
        return Created($"/api/admin/tickets/types/{type.Id}", type);
    }

    [HttpPut("types/{id:guid}")]
    public async Task<IActionResult> UpdateType(Guid id, TicketTypeRequest request, CancellationToken ct)
    {
        var type = await db.TicketTypes.FindAsync([id], ct);
        if (type is null) return NotFound();
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });
        if (request.Capacity < type.SoldCount)
            return BadRequest(new { message = "Capacity cannot be lower than tickets already sold." });

        type.Name = request.Name.Trim();
        type.Price = request.Price;
        type.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant();
        type.Capacity = request.Capacity;
        type.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "TicketType", type.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Ok(type);
    }

    [HttpDelete("types/{id:guid}")]
    public async Task<IActionResult> DeleteType(Guid id, CancellationToken ct)
    {
        var type = await db.TicketTypes.FindAsync([id], ct);
        if (type is null) return NotFound();
        if (await db.TicketOrders.AnyAsync(x => x.TicketTypeId == id, ct))
            return Conflict(new { message = "This ticket type has orders and cannot be deleted." });
        db.TicketTypes.Remove(type);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "TicketType", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetOrders([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.TicketOrders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        var orders = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status, x.CreatedAt, x.ConfirmedAt })
            .ToListAsync(ct);
        return Ok(orders);
    }

    [HttpPut("orders/{id:guid}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, TicketOrderStatusRequest request, CancellationToken ct)
    {
        var target = request.Status?.Trim();
        if (target is not ("Confirmed" or "Cancelled"))
            return BadRequest(new { message = "Status must be Confirmed or Cancelled." });

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var order = await db.TicketOrders.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (order is null) return NotFound();
        if (order.Status == target) return Ok(new { order.Id, order.Status });
        if (order.Status != "Pending")
            return BadRequest(new { message = $"Cannot change an order in status {order.Status}." });

        if (target == "Confirmed")
        {
            var type = await db.TicketTypes.SingleOrDefaultAsync(x => x.Id == order.TicketTypeId, ct);
            if (type is null) return BadRequest(new { message = "Ticket type no longer exists." });
            if (type.SoldCount + order.Quantity > type.Capacity)
                return BadRequest(new { message = "Not enough remaining capacity." });
            type.SoldCount += order.Quantity;
            order.ConfirmedAt = DateTimeOffset.UtcNow;
        }

        order.Status = target;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await audit.LogAsync(target == "Confirmed" ? "TICKET_CONFIRMED" : "TICKET_CANCELLED", "TicketOrder",
            order.Id.ToString(), User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return Ok(new { order.Id, order.Status, order.ConfirmedAt });
    }

    // Staff scanner: verify a scanned QR token WITHOUT changing state. Resolves
    // the opaque token to a ticket and reports a structured outcome the scanner
    // can render immediately. An optional matchId lets a gate reject tickets for
    // a different match. This is a read-only pre-check; the actual entry is the
    // atomic check-in below. Rate limited to blunt token brute-forcing.
    [HttpPost("validate")]
    [EnableRateLimiting("ticket-scan")]
    public async Task<IActionResult> Validate(TicketScanRequest request, CancellationToken ct)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { message = "Token requis." });

        var order = await db.TicketOrders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PublicTicketToken == token, ct);

        var (result, message) = Evaluate(order, request.MatchId);
        await LogScanAsync(result == "Valid" ? "TICKET_VALIDATED"
            : result == "AlreadyUsed" ? "TICKET_ALREADY_USED"
            : result == "Cancelled" ? "TICKET_CANCELLED" : "TICKET_INVALID",
            order, request.MatchId, token, ct);

        return Ok(BuildScanResponse(result, message, order));
    }

    // Staff scanner: atomic entry. Transitions Confirmed -> CheckedIn inside a
    // transaction using a conditional check so two concurrent scanners (or a
    // replayed request) can never both succeed: the second observes CheckedInAt
    // set and reports AlreadyUsed rather than performing a second check-in.
    [HttpPost("check-in")]
    [EnableRateLimiting("ticket-scan")]
    public async Task<IActionResult> CheckIn(TicketScanRequest request, CancellationToken ct)
    {
        var token = request.Token?.Trim();
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { message = "Token requis." });

        var adminId = User.FindFirst("sub")?.Value;

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var order = await db.TicketOrders.SingleOrDefaultAsync(x => x.PublicTicketToken == token, ct);

        var (result, message) = Evaluate(order, request.MatchId);

        // Only a still-Confirmed ticket flips to CheckedIn. Everything else
        // (already used, cancelled, wrong match, invalid) is reported as-is with
        // no state change.
        if (result == "Valid" && order is not null)
        {
            order.Status = "CheckedIn";
            order.CheckedInAt = DateTimeOffset.UtcNow;
            order.CheckedInByAdminId = adminId;
        }

        db.TicketCheckIns.Add(new TicketCheckIn
        {
            TicketOrderId = order?.Id,
            MatchId = order?.MatchId,
            CheckedInByAdminId = adminId,
            DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? null : request.DeviceId!.Trim(),
            Result = result
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await audit.LogAsync(
            result == "Valid" ? "TICKET_CHECKED_IN"
                : result == "AlreadyUsed" ? "TICKET_ALREADY_USED"
                : result == "Cancelled" ? "TICKET_CANCELLED" : "TICKET_INVALID",
            "TicketOrder", order?.Id.ToString(), adminId, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId = order?.MatchId, tokenPrefix = TokenPrefix(token), result }, ct);

        return Ok(BuildScanResponse(result, message, order));
    }

    // Recent check-in history (audit trail) for the scanner and back office.
    [HttpGet("check-ins")]
    public async Task<IActionResult> GetCheckIns([FromQuery] Guid? matchId, [FromQuery] int take, CancellationToken ct)
    {
        var limit = take is < 1 or > 200 ? 50 : take;
        var query = db.TicketCheckIns.AsNoTracking();
        if (matchId is not null) query = query.Where(x => x.MatchId == matchId);
        var items = await query
            .OrderByDescending(x => x.CheckedInAt)
            .Take(limit)
            .Select(x => new { x.Id, x.TicketOrderId, x.MatchId, x.Result, x.CheckedInAt, x.CheckedInByAdminId, x.DeviceId })
            .ToListAsync(ct);
        return Ok(items);
    }

    // Pure evaluation of a scanned ticket. Kept side-effect free so validate and
    // check-in share identical outcome rules.
    private static (string Result, string Message) Evaluate(TicketOrder? order, Guid? matchId)
    {
        if (order is null) return ("Invalid", "Billet introuvable.");
        if (order.Status == "CheckedIn") return ("AlreadyUsed", "Billet déjà utilisé.");
        if (order.Status == "Cancelled") return ("Cancelled", "Billet annulé.");
        if (order.Status != "Confirmed") return ("Invalid", "Billet non valide.");
        if (matchId is not null && matchId != order.MatchId) return ("WrongMatch", "Billet pour un autre match.");
        return ("Valid", "Billet valide.");
    }

    private static object BuildScanResponse(string result, string message, TicketOrder? order) => new
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

    private async Task LogScanAsync(string action, TicketOrder? order, Guid? matchId, string token, CancellationToken ct)
    {
        await audit.LogAsync(action, "TicketOrder", order?.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId = matchId ?? order?.MatchId, tokenPrefix = TokenPrefix(token) }, ct);
    }

    // Never log the full token: only a short prefix for correlation.
    private static string TokenPrefix(string token) =>
        token[..Math.Min(6, token.Length)] + "\u2026";

    private static string? Validate(TicketTypeRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) return "Name is required.";
        if (r.Price < 0) return "Price must be zero or greater.";
        if (r.Capacity < 1) return "Capacity must be at least 1.";
        return null;
    }
}

public sealed record TicketScanRequest(string? Token, Guid? MatchId, string? DeviceId);

public sealed record TicketTypeRequest(
    Guid MatchId,
    string Name,
    decimal Price,
    string? Currency,
    int Capacity,
    bool IsActive = true);

public sealed record TicketOrderStatusRequest(string Status);
