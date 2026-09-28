using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management of fan shop orders (manual payment gateway). The admin lists
// and inspects orders and advances their status. Confirming payment (-> Paid)
// is the point where stock is decremented, inside a transaction, and is
// idempotent (an already-paid order is not decremented twice). The "mark paid +
// decrement stock" step is delegated to the shared OrderPaymentService, which is
// the same code the provider webhooks use. Status transitions are validated to
// avoid illegal jumps.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,ShopManager")]
[Route("api/admin/shop/orders")]
public sealed class AdminShopOrdersController(JsoDbContext db, AuditService audit, OrderPaymentService payments) : ControllerBase
{
    // Allowed forward transitions. Cancelled/Failed are terminal-ish sinks.
    private static readonly Dictionary<string, string[]> Transitions = new()
    {
        ["Pending"] = ["Paid", "Cancelled", "Failed"],
        ["Paid"] = ["Shipped", "Cancelled"],
        ["Shipped"] = ["Delivered"],
        ["Delivered"] = [],
        ["Cancelled"] = [],
        ["Failed"] = ["Pending"],
    };

    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.Orders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Status == status);

        var orders = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.FanUserId, x.Status, x.Currency, x.Total, x.CustomerName, x.CreatedAt, x.PaidAt })
            .ToListAsync(ct);

        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (order is null) return NotFound();

        var items = await db.OrderItems.AsNoTracking()
            .Where(x => x.OrderId == id)
            .Select(x => new { x.ProductId, x.ProductName, x.UnitPrice, x.Quantity, x.LineTotal })
            .ToListAsync(ct);

        return Ok(new
        {
            order.Id, order.FanUserId, order.Status, order.Currency, order.Total,
            order.CustomerName, order.CustomerEmail, order.Note, order.ProviderRef,
            order.CreatedAt, order.PaidAt, items
        });
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, OrderStatusRequest request, CancellationToken ct)
    {
        var target = request.Status?.Trim();
        if (string.IsNullOrWhiteSpace(target) || !Transitions.ContainsKey(target))
            return BadRequest(new { message = "Unknown status." });

        // Confirming payment reuses the shared, idempotent "mark paid + decrement
        // stock" logic (same code as the provider webhooks).
        if (target == "Paid")
        {
            var current = await db.Orders.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
            if (current is null) return NotFound();
            if (current.Status == "Paid")
                return Ok(new { current.Id, current.Status }); // idempotent no-op
            if (!Transitions.TryGetValue(current.Status, out var allowedToPaid) || !allowedToPaid.Contains("Paid"))
                return BadRequest(new { message = $"Cannot move an order from {current.Status} to Paid." });

            var result = await payments.MarkOrderPaidAsync(id, ct: ct);
            if (result == OrderPaymentService.MarkPaidResult.NotFound) return NotFound();
            if (result == OrderPaymentService.MarkPaidResult.InsufficientStock)
                return BadRequest(new { message = "Not enough stock to fulfil the order." });

            var paid = await db.Orders.AsNoTracking().SingleAsync(x => x.Id == id, ct);
            await audit.LogAsync("ORDER_PAID", "Order", paid.Id.ToString(),
                User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
                HttpContext.Connection.RemoteIpAddress?.ToString(), new { paid.Status }, ct);
            return Ok(new { paid.Id, paid.Status, paid.PaidAt });
        }

        var order = await db.Orders.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (order is null) return NotFound();

        if (order.Status == target)
            return Ok(new { order.Id, order.Status }); // idempotent no-op

        if (!Transitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(target))
            return BadRequest(new { message = $"Cannot move an order from {order.Status} to {target}." });

        order.Status = target;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("UPDATE", "Order", order.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { order.Status }, ct);

        return Ok(new { order.Id, order.Status, order.PaidAt });
    }
}

public sealed record OrderStatusRequest(string Status);
