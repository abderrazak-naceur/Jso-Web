using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    private static string? Validate(TicketTypeRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) return "Name is required.";
        if (r.Price < 0) return "Price must be zero or greater.";
        if (r.Capacity < 1) return "Capacity must be at least 1.";
        return null;
    }
}

public sealed record TicketTypeRequest(
    Guid MatchId,
    string Name,
    decimal Price,
    string? Currency,
    int Capacity,
    bool IsActive = true);

public sealed record TicketOrderStatusRequest(string Status);
