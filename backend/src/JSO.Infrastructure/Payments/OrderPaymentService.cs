using JSO.Domain;
using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Single source of truth for "mark an order Paid and decrement stock". Shared by
// the admin manual gateway (AdminShopOrdersController) and the provider webhooks
// so the money-critical, stock-mutating logic is never duplicated.
//
// The operation is idempotent: an order that is already Paid is a no-op, so a
// webhook that is retried (or fires after an admin already confirmed) can never
// decrement stock twice. Stock is mutated inside a transaction.
public sealed class OrderPaymentService(JsoDbContext db)
{
    public enum MarkPaidResult
    {
        MarkedPaid,      // transitioned Pending -> Paid, stock decremented
        AlreadyPaid,     // idempotent no-op
        NotFound,        // order does not exist
        InsufficientStock // could not fulfil; order left untouched
    }

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

        // Idempotent: any already-terminal-paid state is a no-op. Only Pending
        // orders are advanced to Paid + stock decremented.
        if (order.Status != "Pending")
            return MarkPaidResult.AlreadyPaid;

        var items = await db.OrderItems.Where(x => x.OrderId == orderId).ToListAsync(ct);
        foreach (var item in items)
        {
            var product = await db.Products.SingleOrDefaultAsync(p => p.Id == item.ProductId, ct);
            if (product is null) continue; // product removed; keep historical order
            if (product.Stock < item.Quantity)
                return MarkPaidResult.InsufficientStock;
            product.Stock -= item.Quantity;
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
}
