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
public sealed class TicketOrderCompletion(JsoDbContext db, AuditService audit) : IPayableCompletion
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

        if (order.Status == "RefundRequired")
            return PayableCompletionResult.RefundRequired;
        if (order.Status is "Confirmed" or "CheckedIn" or "Cancelled")
            return PayableCompletionResult.AlreadyCompleted;

        var latePayment = order.Status == "Expired"
            || (order.Status == "Pending" && order.ReservationExpiresAt <= DateTimeOffset.UtcNow);
        if (order.Status != "Pending" && order.Status != "Expired")
            return PayableCompletionResult.AlreadyCompleted;
        var priorStatus = order.Status;
        var claimNow = DateTimeOffset.UtcNow;
        var claimed = await db.TicketOrders
            .Where(x => x.Id == payableId && x.Status == priorStatus
                && (priorStatus != "Pending" || (latePayment
                    ? x.ReservationExpiresAt <= claimNow
                    : x.ReservationExpiresAt == null || x.ReservationExpiresAt > claimNow)))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, "ProcessingPayment"), ct);
        if (claimed != 1)
            return PayableCompletionResult.AlreadyCompleted;
        order.Status = "ProcessingPayment";

        var typeExists = await db.TicketTypes.AnyAsync(x => x.Id == order.TicketTypeId, ct);
        if (latePayment)
        {
            if (priorStatus == "Pending" && typeExists)
            {
                await db.TicketTypes.Where(x => x.Id == order.TicketTypeId)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReservedCount, x => x.ReservedCount - order.Quantity), ct);
            }
            var reacquired = !typeExists ? 0 : await db.TicketTypes
                .Where(x => x.Id == order.TicketTypeId && x.IsActive
                    && x.Capacity - x.SoldCount - x.ReservedCount >= order.Quantity)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReservedCount, x => x.ReservedCount + order.Quantity), ct);
            if (reacquired != 1)
            {
                order.Status = "RefundRequired";
                order.PaidAt = DateTimeOffset.UtcNow;
                order.PaymentProvider = paymentProvider;
                order.ProviderRef = providerRef;
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                await audit.LogAsync("PAYMENT_REFUND_REQUIRED", "TicketOrder", order.Id.ToString(),
                    paymentProvider, null, null,
                    new { providerRef, reason = "Late payment after reservation expiry; ticket capacity unavailable." }, ct);
                return PayableCompletionResult.RefundRequired;
            }
        }
        if (!typeExists)
            return PayableCompletionResult.Unavailable;

        // Convert the hold to a sale with one conditional SQL update. Writing
        // absolute values from a previously loaded entity loses concurrent
        // webhook increments for different orders on the same ticket type.
        var converted = await db.TicketTypes.Where(x => x.Id == order.TicketTypeId
                && x.ReservedCount >= order.Quantity
                && x.SoldCount + x.ReservedCount <= x.Capacity)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.ReservedCount, x => x.ReservedCount - order.Quantity)
                .SetProperty(x => x.SoldCount, x => x.SoldCount + order.Quantity), ct);
        if (converted != 1)
            return PayableCompletionResult.Unavailable;
        order.Status = "Confirmed";
        order.ConfirmedAt = DateTimeOffset.UtcNow;
        order.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            order.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            order.ProviderRef = providerRef;

        // Issue the opaque QR token exactly at the Pending -> Confirmed
        // transition, inside the same transaction. Idempotent by construction:
        // this branch only runs for a Pending order, and a re-run finds the
        // order already Confirmed (handled above), so the token is never
        // regenerated once emitted.
        if (string.IsNullOrEmpty(order.PublicTicketToken))
        {
            order.PublicTicketToken = TicketTokenGenerator.Generate();
            order.IssuedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // Audit the issuance without ever logging the full token (only a short,
        // non-reversible prefix for correlation).
        await audit.LogAsync("TICKET_ISSUED", "TicketOrder", order.Id.ToString(),
            paymentProvider, null, null,
            new { order.MatchId, tokenPrefix = TokenPrefix(order.PublicTicketToken) }, ct);
        return PayableCompletionResult.Completed;
    }

    // Never log the full token: only a short prefix so entries can be correlated
    // without exposing a usable credential.
    private static string? TokenPrefix(string? token) =>
        string.IsNullOrEmpty(token) ? null : token[..Math.Min(6, token.Length)] + "\u2026";
}
