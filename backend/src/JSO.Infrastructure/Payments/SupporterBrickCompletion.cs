using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Completes a paid supporter brick: sets PaymentStatus = "Paid" + PaidAt. This
// is ORTHOGONAL to moderation: it NEVER touches the brick's Status (Pending /
// Approved / Rejected), so paying can never bypass moderation and public wall
// visibility stays driven solely by Status == "Approved".
//
// Idempotent + transactional: a brick already marked Paid is a no-op, so a
// retried webhook can never double-count a contribution.
public sealed class SupporterBrickCompletion(JsoDbContext db) : IPayableCompletion
{
    public string PayableType => PayableTypes.SupporterBrick;

    // Expected charge for a brick is its declared Amount (TND).
    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var brick = await db.SupporterBricks.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == payableId, ct);
        return brick?.Amount;
    }

    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var brick = await db.SupporterBricks.SingleOrDefaultAsync(x => x.Id == payableId, ct);
        if (brick is null)
            return PayableCompletionResult.NotFound;

        // Idempotent: a brick already paid is a no-op. We only ever advance the
        // PaymentStatus; the moderation Status is deliberately left untouched.
        if (brick.PaymentStatus == "Paid")
            return PayableCompletionResult.AlreadyCompleted;

        brick.PaymentStatus = "Paid";
        brick.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            brick.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            brick.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayableCompletionResult.Completed;
    }
}
