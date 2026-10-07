using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

public sealed class DonationCompletion(JsoDbContext db) : IPayableCompletion
{
    public string PayableType => PayableTypes.Donation;

    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var donation = await db.SupporterBricks.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == payableId && x.Status == "Donation", ct);
        return donation?.Amount;
    }

    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var donation = await db.SupporterBricks.SingleOrDefaultAsync(
            x => x.Id == payableId && x.Status == "Donation", ct);
        if (donation is null)
            return PayableCompletionResult.NotFound;
        if (donation.PaymentStatus == "Paid")
            return PayableCompletionResult.AlreadyCompleted;

        donation.PaymentStatus = "Paid";
        donation.PaidAt = DateTimeOffset.UtcNow;
        if (!string.IsNullOrWhiteSpace(paymentProvider)) donation.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef)) donation.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayableCompletionResult.Completed;
    }
}