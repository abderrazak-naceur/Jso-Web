namespace JSO.Domain;

// Fan shop order. Prices are recomputed server-side at creation and stored on
// the order/items so later product changes never alter historical orders.
// Status flow: Pending -> Paid -> Shipped -> Delivered (or Failed/Cancelled).
// Payment can be confirmed either by an admin (manual gateway) or by a real
// online provider (Flouci for Tunisia, Stripe otherwise) via a server-side
// webhook. ProviderRef holds the provider's session/payment id (Stripe Checkout
// session id or Flouci payment id) used to reconcile the webhook with the order.
public sealed class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FanUserId { get; set; }
    public string Status { get; set; } = "Pending";
    public string Currency { get; set; } = "TND";
    public decimal Total { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? Note { get; set; }
    public string? ProviderRef { get; set; }
    // Real payment provider routed at checkout by the buyer's country:
    // "Flouci" (Tunisia, TND) or "Stripe" (international). Null until the fan
    // starts an online payment; the manual admin gateway leaves it null.
    public string? PaymentProvider { get; set; }
    // ISO 3166-1 alpha-2 country the fan selected at checkout (e.g. "TN", "FR").
    public string? Country { get; set; }
    // Amount actually charged by the provider, in the currency actually used
    // (see ChargedCurrency). For Flouci this equals Total in TND; for Stripe it
    // is Total converted at the configured TND->Stripe rate. Null until an
    // online payment is initiated so the record reflects what the buyer paid.
    public decimal? ChargedAmount { get; set; }
    // Currency actually charged (upper-case, e.g. "TND" or "EUR"). Null until an
    // online payment is initiated.
    public string? ChargedCurrency { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? PaidAt { get; set; }
}
