using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api;

public static class FundraisingQueries
{
    public static IQueryable<FundraisingProjectView> Projects(JsoDbContext db, Guid? id = null, bool publishedOnly = false) =>
        db.FundraisingProjects.AsNoTracking().Where(p => (!id.HasValue || p.Id == id.Value) && (!publishedOnly || p.Status == "Published"))
        .OrderByDescending(p => p.CreatedAt).Select(p => new FundraisingProjectView(
            p.Id, p.Title, p.Description, p.BudgetTnd, p.DurationMonths, p.TemplateId, p.ImageUrl, p.Status,
            db.SupporterBricks.Where(b => b.FundraisingProjectId == p.Id && b.PaymentStatus == "Paid").Sum(b => (decimal?)b.Amount) ?? 0m,
            db.FundraisingCommitments.Count(c => c.ProjectId == p.Id && (c.PaymentMethod == "Cash" || db.SupporterBricks.Any(b => b.FundraisingCommitmentId == c.Id && b.PaymentStatus == "Paid"))),
            db.FundraisingCommitments.Count(c => c.ProjectId == p.Id && db.SupporterBricks.Any(b => b.FundraisingCommitmentId == c.Id && b.PaymentStatus == "Paid")),
            db.SupporterBricks.Count(b => b.FundraisingProjectId == p.Id && b.PaymentStatus == "Paid"), p.CreatedAt));

    public static async Task<object?> Commitment(JsoDbContext db, Guid id, CancellationToken ct)
    {
        var commitment = await db.FundraisingCommitments.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id, ct);
        if (commitment is null) return null;
        var title = await db.FundraisingProjects.Where(p => p.Id == commitment.ProjectId).Select(p => p.Title).SingleAsync(ct);
        var installments = await db.SupporterBricks.AsNoTracking().Where(b => b.FundraisingCommitmentId == id)
            .OrderBy(b => b.InstallmentNumber)
            .Select(b => new { b.Id, b.InstallmentNumber, b.Amount, b.PaymentStatus, b.PaymentProvider, b.PaidAt }).ToListAsync(ct);
        return new
        {
            commitment.Id, commitment.ProjectId, projectTitle = title, commitment.DisplayName, commitment.Email, commitment.Phone,
            commitment.MonthlyAmountTnd, commitment.Months, commitment.PaymentMethod, commitment.CreatedAt,
            installments = installments.Select(b => new { b.Id, b.InstallmentNumber, b.Amount, b.PaymentStatus,
                b.PaymentProvider, b.PaidAt, dueAt = commitment.CreatedAt.AddMonths((b.InstallmentNumber ?? 1) - 1) })
        };
    }
}

public static class FundraisingAccess
{
    public static string HashToken(string token) => Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    public static bool Matches(string expected, string token) => token.Length == 43 && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
        System.Text.Encoding.ASCII.GetBytes(expected), System.Text.Encoding.ASCII.GetBytes(HashToken(token)));
}

public sealed record FundraisingProjectView(Guid Id, string Title, string Description, decimal BudgetTnd,
    int DurationMonths, string TemplateId, string? ImageUrl, string Status, decimal TotalPaidTnd,
    int SupporterCount, int PaidSupporterCount, int PaidInstallmentCount, DateTimeOffset CreatedAt)
{
    public decimal ProgressPercent => BudgetTnd > 0 ? Math.Min(100m, TotalPaidTnd / BudgetTnd * 100m) : 0m;
}
