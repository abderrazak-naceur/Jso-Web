namespace JSO.Infrastructure.Payments;

// Dispatches a verified payment to the right IPayableCompletion by PayableType.
// This is the single entry point the provider webhooks use: given a PayableType
// + PayableId resolved from the provider metadata/reference, it cross-checks the
// expected TND amount and then completes the payable idempotently.
//
// Centralising the routing means the money-critical completion logic (stock,
// capacity, brick payment) lives once per payable type and the webhooks never
// duplicate or branch on it.
public sealed class PayableCompletionRouter
{
    private readonly Dictionary<string, IPayableCompletion> _byType;

    public PayableCompletionRouter(IEnumerable<IPayableCompletion> completions)
    {
        _byType = completions.ToDictionary(c => c.PayableType, StringComparer.Ordinal);
    }

    public bool IsKnownType(string? payableType) =>
        payableType is not null && _byType.ContainsKey(payableType);

    // Returns the completion for a payable type, or null when unknown.
    public IPayableCompletion? For(string? payableType) =>
        payableType is not null && _byType.TryGetValue(payableType, out var c) ? c : null;

    // Expected TND amount for the payable (null when unknown/nonexistent).
    public Task<decimal?> GetExpectedAmountTndAsync(string payableType, Guid payableId, CancellationToken ct)
    {
        var completion = For(payableType);
        return completion is null ? Task.FromResult<decimal?>(null) : completion.GetExpectedAmountTndAsync(payableId, ct);
    }

    // Completes the payable (idempotent, transactional) via its handler.
    public Task<PayableCompletionResult> CompleteAsync(
        string payableType, Guid payableId, string? paymentProvider, string? providerRef, CancellationToken ct)
    {
        var completion = For(payableType);
        return completion is null
            ? Task.FromResult(PayableCompletionResult.NotFound)
            : completion.CompleteAsync(payableId, paymentProvider, providerRef, ct);
    }
}
