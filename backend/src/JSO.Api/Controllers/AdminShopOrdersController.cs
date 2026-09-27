using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management of fan shop orders (manual payment gateway). The admin lists
// and inspects orders and advances their status. Confirming payment (-> Paid)
// is the point where stock is decremented, inside a transaction, and is
// idempotent (an already-paid order is not decremented twice). Status
// transitions are validated to avoid illegal jumps.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,ShopManager")]
[Route("api/admin/shop/orders")]
public sealed class AdminShopOrdersController(JsoDbContext db, AuditService audit) : ControllerBase
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

        // Use a transaction because moving to Paid also decrements stock.
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var order = await db.Orders.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (order is null) return NotFound();

        if (order.Status == target)
            return Ok(new { order.Id, order.Status }); // idempotent no-op

        if (!Transitions.TryGetValue(order.Status, out var allowed) || !allowed.Contains(target))
            return BadRequest(new { message = $"Cannot move an order from {order.Status} to {target}." });

        if (target == "Paid")
        {
            var items = await db.OrderItems.Where(x => x.OrderId == id).ToListAsync(ct);
            foreach (var item in items)
            {
                var product = await db.Products.SingleOrDefaultAsync(p => p.Id == item.ProductId, ct);
                if (product is null) continue; // product removed; keep historical order
                if (product.Stock < item.Quantity)
                    return BadRequest(new { message = $"Not enough stock to fulfil '{item.ProductName}'." });
                product.Stock -= item.Quantity;
            }
            order.PaidAt = DateTimeOffset.UtcNow;
        }

        order.Status = target;
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await audit.LogAsync(target == "Paid" ? "ORDER_PAID" : "UPDATE", "Order", order.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(), new { order.Status }, ct);

        return Ok(new { order.Id, order.Status, order.PaidAt });
    }
}

public sealed record OrderStatusRequest(string Status);
