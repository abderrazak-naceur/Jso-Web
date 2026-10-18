using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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
