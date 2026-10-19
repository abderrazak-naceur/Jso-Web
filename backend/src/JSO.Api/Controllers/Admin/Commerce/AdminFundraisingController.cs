using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using Npgsql;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,FinanceManager")]
[Route("api/admin/fundraising/projects")]
public sealed class AdminFundraisingController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await FundraisingQueries.Projects(db).ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(EditFundraisingProject request, CancellationToken ct)
    {
        var project = new FundraisingProject();
        return await Save(project, request, true, ct);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, EditFundraisingProject request, CancellationToken ct)
    {
        var project = await db.FundraisingProjects.SingleOrDefaultAsync(p => p.Id == id, ct);
        return project is null ? NotFound() : await Save(project, request, false, ct);
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        var project = await db.FundraisingProjects.SingleOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return NotFound();
        project.Status = "Archived";
        project.UpdatedAt = DateTimeOffset.UtcNow;
        await audit.LogAsync("FUNDRAISING_PROJECT_ARCHIVED", "FundraisingProject", id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { project.Title }, ct);
        return Ok(await FundraisingQueries.Projects(db, id).SingleAsync(ct));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        // The financial guard and all dependent removals share one transaction.
        // A restrictive FK also prevents a concurrent registration from being orphaned.
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        var project = await db.FundraisingProjects.SingleOrDefaultAsync(p => p.Id == id, ct);
        if (project is null) return NotFound();
        var commitments = await db.FundraisingCommitments.Where(c => c.ProjectId == id).ToListAsync(ct);
        var commitmentIds = commitments.Select(c => c.Id).ToArray();
        var installments = await db.SupporterBricks.Where(b => b.FundraisingProjectId == id ||
            (b.FundraisingCommitmentId.HasValue && commitmentIds.Contains(b.FundraisingCommitmentId.Value))).ToListAsync(ct);
        if (await HasPaymentHistory(installments, ct))
            return Conflict(new { message = "Ce projet contient un paiement ou une tentative de paiement. Archivez-le pour conserver son historique.", canArchive = true });
        db.SupporterBricks.RemoveRange(installments);
        db.FundraisingCommitments.RemoveRange(commitments);
        db.FundraisingProjects.Remove(project);
        try
        {
            await audit.LogAsync("FUNDRAISING_PROJECT_DELETED", "FundraisingProject", id.ToString(),
                User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
                new { project.Title, commitmentCount = commitments.Count, installmentCount = installments.Count }, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch (Exception error) when (error is DbUpdateException || error is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure })
        {
            return Conflict(new { message = "Le projet a été modifié pendant la suppression. Actualisez la liste et réessayez ; aucune suppression partielle n’a été validée.", canArchive = true });
        }
        return NoContent();
    }

    [HttpPut("{id:guid}/commitments/{commitmentId:guid}")]
    public async Task<IActionResult> UpdateCommitment(Guid id, Guid commitmentId, EditFundraisingCommitment request, CancellationToken ct)
    {
        var displayName = request.DisplayName?.Trim() ?? "";
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        if (displayName.Length is < 1 or > 80 || phone?.Length > 32 || email?.Length > 254 ||
            (email is not null && !System.Net.Mail.MailAddress.TryCreate(email, out _)))
            return BadRequest(new { message = "Indiquez un nom public (80 caractères maximum) et des coordonnées valides." });
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        var commitment = await db.FundraisingCommitments.SingleOrDefaultAsync(c => c.Id == commitmentId && c.ProjectId == id, ct);
        if (commitment is null) return NotFound();
        commitment.DisplayName = displayName;
        commitment.Phone = phone;
        commitment.Email = email;
        var installments = await db.SupporterBricks.Where(b => b.FundraisingCommitmentId == commitmentId).ToListAsync(ct);
        foreach (var installment in installments.Where(b => !HasPaymentMarker(b)))
        {
            // Receipts and provider reconciliation retain the donor details used at payment time.
            installment.DisplayName = displayName;
            installment.DonorPhone = phone;
        }
        try
        {
            await audit.LogAsync("FUNDRAISING_COMMITMENT_UPDATED", "FundraisingCommitment", commitmentId.ToString(),
                User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
                new { projectId = id, updatedFields = new[] { "DisplayName", "Phone", "Email" } }, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch (Exception error) when (error is DbUpdateException || error is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure })
        {
            return Conflict(new { message = "Cette participation a changé pendant la modification. Actualisez son suivi avant de réessayer." });
        }
        return Ok(await FundraisingQueries.Commitment(db, commitmentId, ct));
    }

    [HttpDelete("{id:guid}/commitments/{commitmentId:guid}")]
    public async Task<IActionResult> DeleteCommitment(Guid id, Guid commitmentId, CancellationToken ct)
    {
        await using var transaction = db.Database.IsRelational()
            ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        var commitment = await db.FundraisingCommitments.SingleOrDefaultAsync(c => c.Id == commitmentId && c.ProjectId == id, ct);
        if (commitment is null) return NotFound();
        var installments = await db.SupporterBricks.Where(b => b.FundraisingCommitmentId == commitmentId).ToListAsync(ct);
        if (await HasPaymentHistory(installments, ct))
            return Conflict(new { message = "Cette inscription contient un paiement ou une tentative de paiement et doit être conservée dans l’historique." });
        db.SupporterBricks.RemoveRange(installments);
        db.FundraisingCommitments.Remove(commitment);
        try
        {
            await audit.LogAsync("FUNDRAISING_COMMITMENT_DELETED", "FundraisingCommitment", commitmentId.ToString(),
                User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
                new { projectId = id, installmentCount = installments.Count }, ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
        }
        catch (Exception error) when (error is DbUpdateException || error is PostgresException { SqlState: PostgresErrorCodes.SerializationFailure })
        {
            return Conflict(new { message = "L’inscription a été modifiée pendant la suppression. Actualisez la liste ; aucune suppression partielle n’a été validée." });
        }
        return NoContent();
    }

    private static bool HasPaymentMarker(SupporterBrick installment) =>
        installment.PaymentStatus != "Pending" || installment.PaidAt.HasValue || installment.ProviderRef is not null ||
        installment.ChargedAmount.HasValue || installment.ChargedCurrency is not null ||
        (installment.PaymentProvider is not null && installment.PaymentProvider != "Cash") ||
        installment.CashPointType is not null || installment.CashPointName is not null;

    private async Task<bool> HasPaymentHistory(List<SupporterBrick> installments, CancellationToken ct)
    {
        if (installments.Any(HasPaymentMarker)) return true;
        var ids = installments.Select(b => b.Id.ToString()).ToArray();
        // No separate payment-attempt table exists in this model. Preserve the audit
        // evidence too if a legacy row no longer contains its original provider reference.
        return ids.Length > 0 && await db.AuditLogs.AnyAsync(log => ids.Contains(log.EntityId!) &&
            (log.Action.Contains("PAYMENT") || log.Action == "CASH_DONATION_CONFIRMED" || log.Action == "DONATION_REFUND_REQUEST"), ct);
    }

    [HttpGet("{id:guid}/commitments")]
    public async Task<IActionResult> Commitments(Guid id, CancellationToken ct)
    {
        if (!await db.FundraisingProjects.AnyAsync(p => p.Id == id, ct)) return NotFound();
        var commitments = await db.FundraisingCommitments.AsNoTracking().Where(c => c.ProjectId == id).OrderByDescending(c => c.CreatedAt).ToListAsync(ct);
        var installments = await db.SupporterBricks.AsNoTracking().Where(b => b.FundraisingProjectId == id).OrderBy(b => b.InstallmentNumber)
            .Select(b => new { b.Id, b.FundraisingCommitmentId, b.InstallmentNumber, b.Amount, b.PaymentStatus, b.PaymentProvider, b.PaidAt }).ToListAsync(ct);
        return Ok(commitments.Select(c => new { c.Id, c.DisplayName, c.Phone, c.Email, c.MonthlyAmountTnd, c.Months, c.PaymentMethod, c.CreatedAt,
            installments = installments.Where(b => b.FundraisingCommitmentId == c.Id).Select(b => new { b.Id, b.InstallmentNumber, b.Amount, b.PaymentStatus, b.PaymentProvider, b.PaidAt, dueAt = c.CreatedAt.AddMonths((b.InstallmentNumber ?? 1) - 1) }) }));
    }

    private async Task<IActionResult> Save(FundraisingProject project, EditFundraisingProject request, bool create, CancellationToken ct)
    {
        project.Title = request.Title?.Trim() ?? "";
        project.Description = request.Description?.Trim() ?? "";
        project.BudgetTnd = request.BudgetTnd;
        project.DurationMonths = request.DurationMonths;
        project.TemplateId = request.TemplateId ?? "";
        project.Status = request.Status ?? "Draft";
        project.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        if (FundraisingRules.ValidateProject(project) is { } error) return BadRequest(new { message = error });
        if (project.ImageUrl is { } image && (image.Length > 2048 ||
            !(image.StartsWith('/') && !image.StartsWith("//") && !image.Contains('\\')) &&
            !(Uri.TryCreate(image, UriKind.Absolute, out var uri) && uri.Scheme == "https")))
            return BadRequest(new { message = "L’image doit utiliser une adresse HTTPS ou un chemin du site." });
        project.UpdatedAt = DateTimeOffset.UtcNow;
        if (create) db.FundraisingProjects.Add(project);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(create ? "FUNDRAISING_PROJECT_CREATED" : "FUNDRAISING_PROJECT_UPDATED", "FundraisingProject", project.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { project.Title, project.Status, project.BudgetTnd }, ct);
        return Ok(await FundraisingQueries.Projects(db, project.Id).SingleAsync(ct));
    }
}

public sealed record EditFundraisingProject(string? Title, string? Description, decimal BudgetTnd,
    int DurationMonths = 10, string? TemplateId = "bus", string? ImageUrl = null, string? Status = "Draft");

public sealed record EditFundraisingCommitment(string? DisplayName, string? Phone = null, string? Email = null);
