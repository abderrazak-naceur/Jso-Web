using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Completes a paid ticket reservation: moves a Pending TicketOrder to Confirmed
// and increments the TicketType.SoldCount (capacity), mirroring exactly what the
// admin manual gateway (AdminTicketsController) does when it confirms an order.
//
// Idempotent + transactional: an order not in Pending is a no-op, so a retried
// webhook can never increment SoldCount twice. If the ticket type no longer has
// remaining capacity the order is left Pending (Unavailable) rather than
// oversold.
public sealed class TicketOrderCompletion(JsoDbContext db) : IPayableCompletion
{
    public string PayableType => PayableTypes.TicketOrder;

    // Expected charge for a ticket order is its snapshotted TND total.
    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var order = await db.TicketOrders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == payableId, ct);
        return order?.Total;
    }

    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var order = await db.TicketOrders.SingleOrDefaultAsync(x => x.Id == payableId, ct);
        if (order is null)
            return PayableCompletionResult.NotFound;

        // Idempotent: only a Pending reservation is advanced. Confirmed/Cancelled
        // are terminal for payment purposes.
        if (order.Status != "Pending")
            return PayableCompletionResult.AlreadyCompleted;

        var type = await db.TicketTypes.SingleOrDefaultAsync(x => x.Id == order.TicketTypeId, ct);
        if (type is null)
            return PayableCompletionResult.Unavailable; // type removed; leave Pending
        if (type.SoldCount + order.Quantity > type.Capacity)
            return PayableCompletionResult.Unavailable; // no capacity; do not oversell

        type.SoldCount += order.Quantity;
        order.Status = "Confirmed";
        order.ConfirmedAt = DateTimeOffset.UtcNow;
        order.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            order.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            order.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayableCompletionResult.Completed;
    }
}
