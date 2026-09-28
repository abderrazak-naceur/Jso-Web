namespace JSO.Infrastructure.Payments;

// Completing a verified payment means advancing exactly ONE kind of payable to
// its "paid" state, applying its own money-critical side effect (decrement shop
// stock, increment ticket capacity, mark a supporter brick paid). Each payable
// type provides an IPayableCompletion; the PayableCompletionRouter dispatches by
// PayableType so the webhook has a single, uniform entry point.
//
// Every completion MUST be idempotent (a retried/duplicate webhook is a no-op on
// an already-completed payable) and MUST mutate inside a transaction, so a side
// effect (stock/capacity) can never be applied twice.
public interface IPayableCompletion
{
    // The PayableType (see PayableTypes) this completion handles.
    string PayableType { get; }

    // Returns the expected charge (in TND) for the given payable so the webhook
    // can cross-check the provider-reported amount before completing. Returns
    // null when the payable does not exist (unknown reference).
    Task<decimal?> GetExpectedAmountTndAsync(Guid payableId, CancellationToken ct);

    // Marks the payable paid (applying its side effect) if it is still pending.
    // Idempotent and transactional. paymentProvider/providerRef are recorded for
    // audit/reconciliation when provided.
    Task<PayableCompletionResult> CompleteAsync(
        Guid payableId,
        string? paymentProvider,
        string? providerRef,
        CancellationToken ct);
}

// Outcome of a completion attempt. Mirrors the shop OrderPaymentService result
// so all payables report a uniform, auditable status.
public enum PayableCompletionResult
{
    Completed,        // transitioned pending -> paid, side effect applied
    AlreadyCompleted, // idempotent no-op
    NotFound,         // payable does not exist
    Unavailable       // could not fulfil (e.g. insufficient stock/capacity)
}
