using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure.Social;

namespace JSO.Infrastructure.Payments;

public sealed class DonationCompletion(JsoDbContext db, WhatsAppSender whatsApp) : IPayableCompletion
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

        if (donation.WhatsAppOptIn && !string.IsNullOrWhiteSpace(donation.DonorPhone))
        {
            try
            {
                await whatsApp.SendDonationReceiptAsync(
                    donation.Id,
                    donation.DonorPhone,
                    donation.WhatsAppOptIn,
                    donation.DisplayName ?? "Donateur JSO",
                    donation.Amount,
                    "TND",
                    BuildReceiptNumber(donation),
                    ct);
            }
            catch
            {
                // Payment completion must never be rolled back because WhatsApp is unavailable.
            }
        }

        return PayableCompletionResult.Completed;
    }

    private static string BuildReceiptNumber(SupporterBrick donation) =>
        string.Equals(donation.PaymentProvider, "Cash", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(donation.ProviderRef)
            ? donation.ProviderRef
            : $"JSO-DON-{donation.PaidAt:yyyyMMdd}-{donation.Id.ToString("N")[..8].ToUpperInvariant()}";
}