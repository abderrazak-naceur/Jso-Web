using JSO.Domain;
using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

/// <summary>
/// Atomic, expiring holds for ticket capacity and shop stock. Counters are
/// changed through conditional database updates so concurrent checkout requests
/// cannot reserve the same final units.
/// </summary>
public sealed class InventoryReservationService(JsoDbContext db)
{
    public static readonly TimeSpan ReservationLifetime = TimeSpan.FromMinutes(30);
    public static readonly TimeSpan PaymentReservationLifetime = TimeSpan.FromHours(2);

    public async Task<int> ReleaseExpiredAsync(CancellationToken ct)
    {
        await using var tx = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(ct)
            : null;
        var now = DateTimeOffset.UtcNow;
        var released = 0;

        var tickets = await db.TicketOrders.AsNoTracking()
            .Where(x => x.Status == "Pending" && x.ReservationExpiresAt <= now)
            .Select(x => new { x.Id, x.TicketTypeId, x.Quantity })
            .ToListAsync(ct);
        foreach (var ticket in tickets)
        {
            var changed = await db.TicketOrders
                .Where(x => x.Id == ticket.Id && x.Status == "Pending" && x.ReservationExpiresAt <= now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, "Expired"), ct);
            if (changed != 1) continue;
            await db.TicketTypes.Where(x => x.Id == ticket.TicketTypeId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.ReservedCount, x => x.ReservedCount - ticket.Quantity), ct);
            released++;
        }

        var orders = await db.Orders.AsNoTracking()
            .Where(x => x.Status == "Pending" && x.ReservationExpiresAt <= now)
            .Select(x => x.Id)
            .ToListAsync(ct);
        foreach (var orderId in orders)
        {
            var changed = await db.Orders
                .Where(x => x.Id == orderId && x.Status == "Pending" && x.ReservationExpiresAt <= now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(x => x.Status, "Expired"), ct);
            if (changed != 1) continue;
            var items = await db.OrderItems.AsNoTracking()
                .Where(x => x.OrderId == orderId)
                .Select(x => new { x.ProductId, x.Quantity })
                .ToListAsync(ct);
            foreach (var item in items)
            {
                await db.Products.Where(x => x.Id == item.ProductId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(x => x.ReservedStock, x => x.ReservedStock - item.Quantity), ct);
            }
            released++;
        }

        if (tx is not null) await tx.CommitAsync(ct);
        return released;
    }

    public Task<int> TryReserveTicketAsync(Guid typeId, int quantity, CancellationToken ct) =>
        db.TicketTypes
            .Where(x => x.Id == typeId && x.IsActive
                && x.Capacity - x.SoldCount - x.ReservedCount >= quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.ReservedCount, x => x.ReservedCount + quantity), ct);

    public Task<int> TryReserveProductAsync(Guid productId, int quantity, CancellationToken ct) =>
        db.Products
            .Where(x => x.Id == productId && x.IsActive
                && x.Stock - x.ReservedStock >= quantity)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.ReservedStock, x => x.ReservedStock + quantity), ct);

    public Task ReleaseTicketAsync(Guid typeId, int quantity, CancellationToken ct) =>
        db.TicketTypes.Where(x => x.Id == typeId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.ReservedCount, x => x.ReservedCount - quantity), ct);

    public Task ReleaseProductAsync(Guid productId, int quantity, CancellationToken ct) =>
        db.Products.Where(x => x.Id == productId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.ReservedStock, x => x.ReservedStock - quantity), ct);
}
