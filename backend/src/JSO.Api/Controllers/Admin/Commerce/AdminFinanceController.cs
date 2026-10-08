using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Club finances (piano Area B). Restricted to SuperAdmin / ClubAdmin and the
// dedicated FinanceManager role, because financial data is sensitive. There is
// NO public endpoint. Every write (categories and transactions) is audited via
// AuditService with non-sensitive details only. Money is decimal / numeric(14,2)
// and every amount is validated >= 0.
//
// A "loss" ("soldi persi") is never a stored field: the summary computes
// net = totalIncome - totalExpense over a period, and net < 0 is a loss. All
// aggregation is done server-side with EF Core (GroupBy/Sum).
//
// Category currency is a single configurable club currency, default "TND".
// Deleting a category that still has transactions is REFUSED (409) rather than
// cascading silently; deactivate it instead, or reassign/delete its rows first.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,FinanceManager")]
[Route("api/admin/finance")]
public sealed class AdminFinanceController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] Types = ["Income", "Expense"];
    private const string DefaultCurrency = "TND";

    // ---- Categories ------------------------------------------------------

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories([FromQuery] string? type, CancellationToken ct)
    {
        var query = db.FinanceCategories.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(type))
        {
            var t = NormalizeType(type);
            if (t is null) return BadRequest(new { message = "Type invalide (Income ou Expense)." });
            query = query.Where(x => x.Type == t);
        }
        return Ok(await query.OrderBy(x => x.Type).ThenBy(x => x.Name).ToListAsync(ct));
    }

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(CategoryRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Le nom est requis." });
        var type = NormalizeType(request.Type);
        if (type is null) return BadRequest(new { message = "Type invalide (Income ou Expense)." });

        var category = new FinanceCategory
        {
            Name = request.Name.Trim(),
            Type = type,
            IsActive = request.IsActive
        };
        db.FinanceCategories.Add(category);
        await db.SaveChangesAsync(ct);
        await Log("CREATE", "FinanceCategory", category.Id, new { category.Name, category.Type, category.IsActive }, ct);
        return Created($"/api/admin/finance/categories/{category.Id}", category);
    }

    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, CategoryRequest request, CancellationToken ct)
    {
        var category = await db.FinanceCategories.FindAsync([id], ct);
        if (category is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Le nom est requis." });
        var type = NormalizeType(request.Type);
        if (type is null) return BadRequest(new { message = "Type invalide (Income ou Expense)." });

        // Changing the type of a category that already has transactions would
        // make historical rows inconsistent with their category; refuse it.
        if (category.Type != type && await db.FinanceTransactions.AnyAsync(x => x.CategoryId == id, ct))
            return Conflict(new { message = "Impossible de changer le type d'une catégorie qui a déjà des transactions." });

        category.Name = request.Name.Trim();
        category.Type = type;
        category.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await Log("UPDATE", "FinanceCategory", category.Id, new { category.Name, category.Type, category.IsActive }, ct);
        return Ok(category);
    }

    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        var category = await db.FinanceCategories.FindAsync([id], ct);
        if (category is null) return NotFound();

        // No silent cascade: refuse the delete while transactions reference it.
        if (await db.FinanceTransactions.AnyAsync(x => x.CategoryId == id, ct))
            return Conflict(new { message = "Cette catégorie contient des transactions. Désactivez-la ou supprimez/réaffectez ses transactions d'abord." });

        db.FinanceCategories.Remove(category);
        await db.SaveChangesAsync(ct);
        await Log("DELETE", "FinanceCategory", id, null, ct);
        return NoContent();
    }

    // ---- Transactions ----------------------------------------------------

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] Guid? categoryId, [FromQuery] string? type, [FromQuery] Guid? matchId,
        CancellationToken ct)
    {
        var query = db.FinanceTransactions.AsNoTracking();
        if (from is { } f) query = query.Where(x => x.Date >= f);
        if (to is { } t) query = query.Where(x => x.Date <= t);
        if (categoryId is { } c) query = query.Where(x => x.CategoryId == c);
        if (matchId is { } m) query = query.Where(x => x.MatchId == m);
        if (!string.IsNullOrWhiteSpace(type))
        {
            var nt = NormalizeType(type);
            if (nt is null) return BadRequest(new { message = "Type invalide (Income ou Expense)." });
            query = query.Where(x => x.Type == nt);
        }

        var rows = await query
            .GroupJoin(db.FinanceCategories.AsNoTracking(), x => x.CategoryId, c => c.Id, (x, c) => new { x, c })
            .SelectMany(j => j.c.DefaultIfEmpty(), (j, c) => new
            {
                j.x.Id,
                j.x.Date,
                j.x.CategoryId,
                CategoryName = c != null ? c.Name : null,
                j.x.Type,
                j.x.Amount,
                j.x.Currency,
                j.x.Description,
                j.x.MatchId,
                j.x.CreatedByAdminId,
                j.x.CreatedAt
            })
            .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction(TransactionRequest request, CancellationToken ct)
    {
        var (error, type, currency) = await ValidateTransaction(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var tx = new FinanceTransaction
        {
            Date = request.Date,
            CategoryId = request.CategoryId,
            Type = type!,
            Amount = request.Amount,
            Currency = currency!,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            MatchId = request.MatchId,
            CreatedByAdminId = CurrentAdminId()
        };
        db.FinanceTransactions.Add(tx);
        await db.SaveChangesAsync(ct);
        await Log("CREATE", "FinanceTransaction", tx.Id, new { tx.Date, tx.CategoryId, tx.Type, tx.Amount, tx.Currency }, ct);
        return Created($"/api/admin/finance/transactions/{tx.Id}", tx);
    }

    [HttpPut("transactions/{id:guid}")]
    public async Task<IActionResult> UpdateTransaction(Guid id, TransactionRequest request, CancellationToken ct)
    {
        var tx = await db.FinanceTransactions.FindAsync([id], ct);
        if (tx is null) return NotFound();

        var (error, type, currency) = await ValidateTransaction(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        tx.Date = request.Date;
        tx.CategoryId = request.CategoryId;
        tx.Type = type!;
        tx.Amount = request.Amount;
        tx.Currency = currency!;
        tx.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        tx.MatchId = request.MatchId;
        await db.SaveChangesAsync(ct);
        await Log("UPDATE", "FinanceTransaction", tx.Id, new { tx.Date, tx.CategoryId, tx.Type, tx.Amount, tx.Currency }, ct);
        return Ok(tx);
    }

    [HttpDelete("transactions/{id:guid}")]
    public async Task<IActionResult> DeleteTransaction(Guid id, CancellationToken ct)
    {
        var tx = await db.FinanceTransactions.FindAsync([id], ct);
        if (tx is null) return NotFound();
        db.FinanceTransactions.Remove(tx);
        await db.SaveChangesAsync(ct);
        await Log("DELETE", "FinanceTransaction", id, null, ct);
        return NoContent();
    }

    // ---- Summary ---------------------------------------------------------

    // Aggregated period summary. net = totalIncome - totalExpense; net < 0 is a
    // loss ("soldi persi"). Everything is aggregated in the database.
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        var query = db.FinanceTransactions.AsNoTracking();
        if (from is { } f) query = query.Where(x => x.Date >= f);
        if (to is { } t) query = query.Where(x => x.Date <= t);

        var totalIncome = await query.Where(x => x.Type == "Income").SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;
        var totalExpense = await query.Where(x => x.Type == "Expense").SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;

        var byCategory = await query
            .GroupBy(x => new { x.CategoryId, x.Type })
            .Select(g => new
            {
                g.Key.CategoryId,
                g.Key.Type,
                Total = g.Sum(x => x.Amount)
            })
            .ToListAsync(ct);

        var categoryNames = await db.FinanceCategories.AsNoTracking()
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var byCategoryOut = byCategory
            .Select(x => new FinanceCategoryBreakdown(
                x.CategoryId,
                categoryNames.TryGetValue(x.CategoryId, out var name) ? name : null,
                x.Type,
                x.Total))
            .OrderByDescending(x => x.Total)
            .ToList();

        var byMonthRaw = await query
            .GroupBy(x => new { x.Date.Year, x.Date.Month, x.Type })
            .Select(g => new { g.Key.Year, g.Key.Month, g.Key.Type, Total = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var byMonth = byMonthRaw
            .GroupBy(x => new { x.Year, x.Month })
            .Select(g => new FinanceMonthBreakdown(
                $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                g.Where(x => x.Type == "Income").Sum(x => x.Total),
                g.Where(x => x.Type == "Expense").Sum(x => x.Total),
                g.Where(x => x.Type == "Income").Sum(x => x.Total) - g.Where(x => x.Type == "Expense").Sum(x => x.Total)))
            .OrderBy(x => x.Month)
            .ToList();

        return Ok(new FinanceSummary(
            totalIncome,
            totalExpense,
            totalIncome - totalExpense,
            DefaultCurrency,
            byCategoryOut,
            byMonth));
    }

    // ---- Helpers ---------------------------------------------------------

    private static string? NormalizeType(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var trimmed = raw.Trim();
        return Types.FirstOrDefault(t => string.Equals(t, trimmed, StringComparison.OrdinalIgnoreCase));
    }

    // Validates a transaction and returns the canonical type + currency to store.
    private async Task<(string? error, string? type, string? currency)> ValidateTransaction(TransactionRequest r, CancellationToken ct)
    {
        var type = NormalizeType(r.Type);
        if (type is null) return ("Type invalide (Income ou Expense).", null, null);
        if (r.Amount < 0) return ("Le montant doit être positif ou nul.", null, null);
        if (r.Date == default) return ("La date est requise.", null, null);

        var currency = string.IsNullOrWhiteSpace(r.Currency) ? DefaultCurrency : r.Currency.Trim().ToUpperInvariant();
        if (currency.Length is < 3 or > 8) return ("Devise invalide.", null, null);

        var category = await db.FinanceCategories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == r.CategoryId, ct);
        if (category is null) return ("Catégorie introuvable.", null, null);
        if (!string.Equals(category.Type, type, StringComparison.Ordinal))
            return ("Le type de la transaction doit correspondre au type de la catégorie.", null, null);

        if (r.MatchId is { } mid && !await db.Matches.AnyAsync(x => x.Id == mid, ct))
            return ("Match introuvable.", null, null);

        return (null, type, currency);
    }

    // The JWT carries the admin id in "sub", remapped to NameIdentifier by ASP.NET.
    private Guid? CurrentAdminId()
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private Task Log(string action, string entityType, Guid entityId, object? details, CancellationToken ct) =>
        audit.LogAsync(action, entityType, entityId.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), details, ct);
}

public sealed record CategoryRequest(string Name, string Type, bool IsActive = true);

public sealed record TransactionRequest(
    DateTimeOffset Date,
    Guid CategoryId,
    string Type,
    decimal Amount,
    string? Currency = null,
    string? Description = null,
    Guid? MatchId = null);

public sealed record FinanceCategoryBreakdown(Guid CategoryId, string? CategoryName, string Type, decimal Total);
public sealed record FinanceMonthBreakdown(string Month, decimal Income, decimal Expense, decimal Net);
public sealed record FinanceSummary(
    decimal TotalIncome,
    decimal TotalExpense,
    decimal Net,
    string Currency,
    IReadOnlyList<FinanceCategoryBreakdown> ByCategory,
    IReadOnlyList<FinanceMonthBreakdown> ByMonth);
