using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Completes a paid match stream access: moves a Pending MatchStreamAccess to
// Paid and records PaidAt. Only after this runs (server-side, from the verified
// webhook) is the fan entitled to have the MatchStream.StreamUrl revealed.
//
// Idempotent + transactional: an access already Paid is a no-op, so a retried
// webhook can never double-process it. If the underlying stream was removed the
// access is left Pending (Unavailable) rather than granted.
public sealed class MatchStreamAccessCompletion(JsoDbContext db) : IPayableCompletion
{
    public string PayableType => PayableTypes.MatchStreamAccess;

    // Expected charge for an access is the price of its stream (TND).
    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var row = await db.MatchStreamAccesses.AsNoTracking()
            .Where(x => x.Id == payableId)
            .Join(db.MatchStreams.AsNoTracking(), a => a.MatchStreamId, s => s.Id, (a, s) => (decimal?)s.Price)
            .SingleOrDefaultAsync(ct);
        return row;
    }

    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var access = await db.MatchStreamAccesses.SingleOrDefaultAsync(x => x.Id == payableId, ct);
        if (access is null)
            return PayableCompletionResult.NotFound;

        // Idempotent: an access already Paid is a no-op.
        if (access.Status == "Paid")
            return PayableCompletionResult.AlreadyCompleted;

        // Guard against a stream that no longer exists.
        if (!await db.MatchStreams.AnyAsync(s => s.Id == access.MatchStreamId, ct))
            return PayableCompletionResult.Unavailable;

        access.Status = "Paid";
        access.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            access.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            access.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayableCompletionResult.Completed;
    }
}
