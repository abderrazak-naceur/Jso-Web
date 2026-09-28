using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

// Completes a paid membership: moves a Pending Membership to Active, records
// PaymentStatus="Paid" + PaidAt, and sets the activation window StartsAt = now,
// EndsAt = now + plan DurationDays.
//
// Idempotent + transactional: a membership already Paid is a no-op, so a retried
// webhook can never re-activate or shift the window. If the plan no longer
// exists the membership is left Pending (Unavailable) rather than activated with
// an unknown duration.
public sealed class MembershipCompletion(JsoDbContext db) : IPayableCompletion
{
    public string PayableType => PayableTypes.Membership;

    // Expected charge for a membership is its snapshotted price (TND).
    public async Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct)
    {
        var membership = await db.Memberships.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == payableId, ct);
        return membership?.Price;
    }

    public async Task<PayableCompletionResult> CompleteAsync(
        Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var membership = await db.Memberships.SingleOrDefaultAsync(x => x.Id == payableId, ct);
        if (membership is null)
            return PayableCompletionResult.NotFound;

        // Idempotent: only a Pending payment is advanced. A membership already
        // Paid is a terminal state for payment purposes.
        if (membership.PaymentStatus == "Paid")
            return PayableCompletionResult.AlreadyCompleted;

        var plan = await db.MembershipPlans.SingleOrDefaultAsync(x => x.Id == membership.MembershipPlanId, ct);
        if (plan is null)
            return PayableCompletionResult.Unavailable; // plan removed; leave Pending

        var now = DateTimeOffset.UtcNow;
        membership.Status = "Active";
        membership.PaymentStatus = "Paid";
        membership.StartsAt = now;
        membership.EndsAt = now.AddDays(plan.DurationDays);
        membership.PaidAt = now;
        if (!string.IsNullOrWhiteSpace(paymentProvider))
            membership.PaymentProvider = paymentProvider;
        if (!string.IsNullOrWhiteSpace(providerRef))
            membership.ProviderRef = providerRef;

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return PayableCompletionResult.Completed;
    }
}
