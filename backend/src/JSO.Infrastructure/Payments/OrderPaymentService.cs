using JSO.Domain;
using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Single source of truth for "mark a shop order Paid and decrement stock". Shared
// by the admin manual gateway (AdminShopOrdersController) and the provider
// webhooks (via the generic PayableCompletionRouter) so the money-critical,
// stock-mutating logic is never duplicated.
//
// The operation is idempotent: an order that is already Paid is a no-op, so a
// webhook that is retried (or fires after an admin already confirmed) can never
// decrement stock twice. Stock is mutated inside a transaction.
//
// It also implements IPayableCompletion for PayableTypes.ShopOrder so the shop
// participates in the same generic completion routing as tickets and supporter
// bricks, without changing its behaviour.
public sealed class OrderPaymentService(JsoDbContext db, AuditService audit) : IPayableCompletion
{
    public enum MarkPaidResult
    {
        MarkedPaid,      // transitioned Pending -> Paid, stock decremented
        AlreadyPaid,     // idempotent no-op
        NotFound,        // order does not exist
        InsufficientStock, // could not fulfil before payment was captured
        RefundRequired // payment captured after expiry; reservation could not be reacquired
    }

    public string PayableType => PayableTypes.ShopOrder;

    // Marks the order Paid (decrementing stock) if it is currently Pending.
    // Optionally records the provider/reference used to confirm the payment.
    public async Task<MarkPaidResult> MarkOrderPaidAsync(
        Guid orderId,
        string? paymentProvider = null,
        string? providerRef = null,
        CancellationToken ct = default)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var order = await db.Orders.SingleOrDefaultAsync(x => x.Id == orderId, ct);
        if (order is null)
            return MarkPaidResult.NotFound;

        if (order.Status == "RefundRequired") return MarkPaidResult.RefundRequired;
        if (order.Status is "Paid" or "Shipped" or "Delivered" or "Cancelled" or "Failed")
            return MarkPaidResult.AlreadyPaid;
        var latePayment = order.Status == "Expired"
            || (order.Status == "Pending" && order.ReservationExpiresAt <= DateTimeOffset.UtcNow);
        if (order.Status != "Pending" && order.Status != "Expired")
            return MarkPaidResult.AlreadyPaid;
        var priorStatus = order.Status;
        var claimNow = DateTimeOffset.UtcNow;
        var claimed = await db.Orders
            .Where(x => x.Id == orderId && x.Status == priorStatus
                && (priorStatus != "Pending" || (latePayment
                    ? x.ReservationExpiresAt <= claimNow
                    : x.ReservationExpiresAt == null || x.ReservationExpiresAt > claimNow)))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "ProcessingPayment"), ct);
        if (claimed != 1) return MarkPaidResult.AlreadyPaid;
        order.Status = "ProcessingPayment";

        var items = await db.OrderItems.Where(x => x.OrderId == orderId).ToListAsync(ct);
        var reacquired = new List<(Guid ProductId, int Quantity)>();
        foreach (var group in items.GroupBy(x => x.ProductId))
        {
            var quantity = group.Sum(x => x.Quantity);
            var exists = await db.Products.AnyAsync(p => p.Id == group.Key, ct);
            if (!exists) continue; // product removed; keep historical order
            if (latePayment)
            {
                if (priorStatus == "Pending")
                {
                    await db.Products.Where(p => p.Id == group.Key && p.ReservedStock >= quantity)
                        .ExecuteUpdateAsync(s => s.SetProperty(p => p.ReservedStock, p => p.ReservedStock - quantity), ct);
                }
                var reserved = await db.Products.Where(p => p.Id == group.Key && p.IsActive
                        && p.Stock - p.ReservedStock >= quantity)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.ReservedStock, p => p.ReservedStock + quantity), ct);
                if (reserved != 1)
                {
                    foreach (var prior in reacquired)
                        await db.Products.Where(p => p.Id == prior.ProductId)
                            .ExecuteUpdateAsync(s => s.SetProperty(p => p.ReservedStock, p => p.ReservedStock - prior.Quantity), ct);
                    order.Status = "RefundRequired";
                    order.PaidAt = DateTimeOffset.UtcNow;
                    order.PaymentProvider = paymentProvider;
                    order.ProviderRef = providerRef;
                    await db.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);
                    await audit.LogAsync("PAYMENT_REFUND_REQUIRED", "Order", order.Id.ToString(),
                        paymentProvider, null, null,
                        new { providerRef, reason = "Late payment after reservation expiry; stock unavailable." }, ct);
                    return MarkPaidResult.RefundRequired;
                }
                reacquired.Add((group.Key, quantity));
            }
            else
            {
                // Move reserved stock into sold stock as a single DB-side
                // arithmetic update. This is safe across simultaneous orders.
                var converted = await db.Products.Where(p => p.Id == group.Key
                        && p.ReservedStock >= quantity && p.Stock >= quantity)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(p => p.ReservedStock, p => p.ReservedStock - quantity)
                        .SetProperty(p => p.Stock, p => p.Stock - quantity), ct);
                if (converted != 1) return MarkPaidResult.InsufficientStock;
            }
        }

        if (latePayment)
        {
            foreach (var hold in reacquired)
            {
                var converted = await db.Products.Where(p => p.Id == hold.ProductId
                        && p.ReservedStock >= hold.Quantity && p.Stock >= hold.Quantity)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(p => p.ReservedStock, p => p.ReservedStock - hold.Quantity)
                        .SetProperty(p => p.Stock, p => p.Stock - hold.Quantity), ct);
                if (converted != 1)
                {
                    // The transaction is rolled back on return by disposing tx;
                    // do not commit a partial fulfillment or payment state.
                    return MarkPaidResult.InsufficientStock;
                }
            }
        }

        order.Status = "Paid";
        order.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            order.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            order.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return MarkPaidResult.MarkedPaid;
    }

    // IPayableCompletion: expected charge for a shop order is its TND total.
    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == payableId, ct);
        return order?.Total;
    }

    // IPayableCompletion: delegates to the shared MarkOrderPaidAsync and maps the
    // shop-specific result to the uniform PayableCompletionResult.
    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        var result = await MarkOrderPaidAsync(payableId, paymentProvider, providerRef, ct);
        return result switch
        {
            MarkPaidResult.MarkedPaid => PayableCompletionResult.Completed,
            MarkPaidResult.AlreadyPaid => PayableCompletionResult.AlreadyCompleted,
            MarkPaidResult.NotFound => PayableCompletionResult.NotFound,
            MarkPaidResult.InsufficientStock => PayableCompletionResult.Unavailable,
            MarkPaidResult.RefundRequired => PayableCompletionResult.RefundRequired,
            _ => PayableCompletionResult.Unavailable
        };
    }
}
