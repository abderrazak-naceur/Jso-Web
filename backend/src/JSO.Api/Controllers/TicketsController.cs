using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public + fan ticketing. Anyone can see available ticket types for a published
// match (with remaining availability). A signed-in fan can reserve tickets; the
// price is recomputed server-side and the reservation starts Pending until an
// admin confirms it (manual gateway).
[ApiController]
[Route("api/tickets")]
public sealed class TicketsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("match/{matchId:guid}")]
    public async Task<IActionResult> GetForMatch(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == matchId && x.IsPublished, ct))
            return NotFound();

        var types = await db.TicketTypes.AsNoTracking()
            .Where(x => x.MatchId == matchId && x.IsActive)
            .OrderBy(x => x.Price)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Price,
                x.Currency,
                available = x.Capacity - x.SoldCount
            })
            .ToListAsync(ct);

        return Ok(types);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyTickets(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var orders = await db.TicketOrders.AsNoTracking()
            .Where(x => x.FanUserId == fanId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status, x.CreatedAt })
            .ToListAsync(ct);
        return Ok(orders);
    }

    [HttpPost("reserve")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Reserve(TicketReserveRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        if (request.Quantity < 1 || request.Quantity > 10)
            return BadRequest(new { message = "Quantity must be between 1 and 10." });

        var type = await db.TicketTypes.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.TicketTypeId && x.IsActive, ct);
        if (type is null) return BadRequest(new { message = "Ticket type not available." });
        if (type.Capacity - type.SoldCount < request.Quantity)
            return BadRequest(new { message = "Not enough tickets available." });

        var order = new TicketOrder
        {
            FanUserId = fanId.Value,
            MatchId = type.MatchId,
            TicketTypeId = type.Id,
            TicketTypeName = type.Name,
            UnitPrice = type.Price,
            Currency = type.Currency,
            Quantity = request.Quantity,
            Total = type.Price * request.Quantity,
            Status = "Pending"
        };
        db.TicketOrders.Add(order);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "TicketOrder", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { order.MatchId, order.Total }, ct);

        return Created($"/api/tickets/mine", new { order.Id, order.TicketTypeName, order.Quantity, order.Total, order.Currency, order.Status });
    }

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public sealed record TicketReserveRequest(Guid TicketTypeId, int Quantity);
