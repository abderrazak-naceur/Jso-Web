namespace JSO.Domain;

// Club finance ledger (piano Area B — "Finanze del club").
// Money is modelled as a real income/expense ledger, never a single "money lost"
// field: a loss is simply a negative net (ΣIncome − ΣExpense) over a period, so
// every figure is auditable back to individual transactions.
//
// Monetary precision: Amount is a `decimal` mapped to PostgreSQL numeric(14,2)
// (see JsoDbContext), never a double. Currency is a single configurable club
// currency (default "TND", consistent with the rest of the project).
//
// Access is restricted to SuperAdmin / ClubAdmin / FinanceManager and every
// write is audited (financial data is sensitive). There is no public endpoint.

// A finance category is either an income or an expense bucket
// (e.g. income: billetterie, sponsors, merchandising; expense: salaires,
// déplacements, équipement, arbitrage, sanctions).
public sealed class FinanceCategory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    // "Income" | "Expense".
    public string Type { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// A single ledger entry. MatchId is optional so revenues/costs can be tied to a
// specific match (e.g. matchday ticketing, away-travel costs). CreatedByAdminId
// records the admin author for traceability. Type is kept on the row (redundant
// with the category Type) so historical rows stay meaningful even if a category
// is later renamed/reclassified, and is always validated against the category.
public sealed class FinanceTransaction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset Date { get; set; }
    public Guid CategoryId { get; set; }
    // "Income" | "Expense".
    public string Type { get; set; } = null!;
    // decimal, mapped to numeric(14,2). Always >= 0.
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "TND";
    public string? Description { get; set; }
    public Guid? MatchId { get; set; }
    public Guid? CreatedByAdminId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
