using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/fundraising")]
public sealed class FundraisingController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("projects")]
    public async Task<IActionResult> Projects(CancellationToken ct) =>
        Ok(await FundraisingQueries.Projects(db, publishedOnly: true).ToListAsync(ct));

    [HttpGet("projects/{id:guid}")]
    public async Task<IActionResult> Project(Guid id, CancellationToken ct)
    {
        var project = await FundraisingQueries.Projects(db, id, true).SingleOrDefaultAsync(ct);
        return project is null ? NotFound() : Ok(project);
    }

    [HttpGet("projects/{id:guid}/supporters")]
    public async Task<IActionResult> Supporters(Guid id, [FromQuery] int page = 1, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        if (!await db.FundraisingProjects.AnyAsync(p => p.Id == id && p.Status == "Published", ct)) return NotFound();
        page = Math.Clamp(page, 1, 100_000);
        var query = db.FundraisingCommitments.AsNoTracking().Where(c => c.ProjectId == id &&
            (c.PaymentMethod == "Cash" || db.SupporterBricks.Any(b => b.FundraisingCommitmentId == c.Id && b.PaymentStatus == "Paid")));
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(c => c.DisplayName.Contains(search.Trim()));
        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(c => c.CreatedAt).ThenBy(c => c.Id).Skip((page - 1) * 10).Take(10)
            .Select(c => new { c.Id, c.DisplayName, c.MonthlyAmountTnd, c.Months, c.CreatedAt,
                paidInstallments = db.SupporterBricks.Count(b => b.FundraisingCommitmentId == c.Id && b.PaymentStatus == "Paid"),
                totalPaidTnd = db.SupporterBricks.Where(b => b.FundraisingCommitmentId == c.Id && b.PaymentStatus == "Paid").Sum(b => (decimal?)b.Amount) ?? 0m })
            .ToListAsync(ct);
        return Ok(new { items, page, totalCount, totalPages = (int)Math.Ceiling(totalCount / 10d) });
    }

    [HttpPost("projects/{id:guid}/commitments")]
    public async Task<IActionResult> Join(Guid id, JoinFundraisingRequest request, CancellationToken ct)
    {
        var project = await db.FundraisingProjects.SingleOrDefaultAsync(p => p.Id == id && p.Status == "Published", ct);
        if (project is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.DisplayName) || request.DisplayName.Trim().Length > 80)
            return BadRequest(new { message = "Indiquez votre nom public (80 caractères maximum)." });
        if (!FundraisingRules.MonthlyAmounts.Contains(request.MonthlyAmountTnd) || request.PaymentMethod is not ("Cash" or "Online"))
            return BadRequest(new { message = "Choisissez 5, 10, 20, 30 ou 50 TND par mois et un moyen de paiement disponible." });
        if (request.ClientRequestId == Guid.Empty || request.AccessToken is null || request.AccessToken.Length != 43 || request.AccessToken.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '-' && c != '_'))
            return BadRequest(new { message = "Rechargez la page pour sécuriser votre inscription." });
        if (request.Phone?.Length > 32 || request.Email?.Length > 254 ||
            (!string.IsNullOrWhiteSpace(request.Email) && !System.Net.Mail.MailAddress.TryCreate(request.Email, out _)))
            return BadRequest(new { message = "Vérifiez vos coordonnées de contact." });
        var tokenHash = FundraisingAccess.HashToken(request.AccessToken);
        var existing = await db.FundraisingCommitments.AsNoTracking().SingleOrDefaultAsync(c => c.Id == request.ClientRequestId, ct);
        if (existing is not null)
            return existing.ProjectId == id && existing.MonthlyAmountTnd == request.MonthlyAmountTnd && existing.PaymentMethod == request.PaymentMethod && FundraisingAccess.Matches(existing.AccessTokenHash, request.AccessToken)
                ? Ok(await FundraisingQueries.Commitment(db, existing.Id, ct)) : Conflict();

        var commitment = new FundraisingCommitment
        {
            Id = request.ClientRequestId, ProjectId = id, FanUserId = FanId(), DisplayName = request.DisplayName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            MonthlyAmountTnd = request.MonthlyAmountTnd, Months = project.DurationMonths,
            PaymentMethod = request.PaymentMethod, AccessTokenHash = tokenHash
        };
        db.FundraisingCommitments.Add(commitment);
        db.SupporterBricks.AddRange(FundraisingRules.CreateInstallments(commitment));
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException)
        {
            // A concurrent retry may have committed the same request first.
            // Reuse its schedule only when the secret and original plan match.
            db.ChangeTracker.Clear();
            var concurrent = await db.FundraisingCommitments.AsNoTracking().SingleOrDefaultAsync(c => c.Id == request.ClientRequestId, ct);
            if (concurrent is null) throw;
            return concurrent.ProjectId == id && concurrent.MonthlyAmountTnd == request.MonthlyAmountTnd && concurrent.PaymentMethod == request.PaymentMethod && FundraisingAccess.Matches(concurrent.AccessTokenHash, request.AccessToken)
                ? Ok(await FundraisingQueries.Commitment(db, concurrent.Id, ct)) : Conflict();
        }
        await audit.LogAsync("FUNDRAISING_COMMITMENT_CREATED", "FundraisingCommitment", commitment.Id.ToString(),
            FanId()?.ToString(), null, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { projectId = id, commitment.MonthlyAmountTnd, commitment.Months, commitment.PaymentMethod }, ct);
        return Created($"/api/fundraising/commitments/{commitment.Id}", await FundraisingQueries.Commitment(db, commitment.Id, ct));
    }

    [HttpGet("commitments/{id:guid}")]
    public async Task<IActionResult> Commitment(Guid id, CancellationToken ct)
    {
        var commitment = await db.FundraisingCommitments.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id, ct);
        if (commitment is null) return NotFound();
        var token = Request.Headers["X-Fundraising-Token"].ToString();
        if (!(FanId() is { } fanId && fanId == commitment.FanUserId) &&
            !FundraisingAccess.Matches(commitment.AccessTokenHash, token)) return Unauthorized();
        return Ok(await FundraisingQueries.Commitment(db, id, ct));
    }

    [Authorize(Roles = "Fan")]
    [HttpPost("commitments/{id:guid}/claim")]
    public async Task<IActionResult> Claim(Guid id, CancellationToken ct)
    {
        if (FanId() is not { } fanId) return Unauthorized();
        var commitment = await db.FundraisingCommitments.SingleOrDefaultAsync(c => c.Id == id, ct);
        if (commitment is null) return NotFound();
        if (!FundraisingAccess.Matches(commitment.AccessTokenHash, Request.Headers["X-Fundraising-Token"].ToString()))
            return Unauthorized();
        if (commitment.FanUserId is { } ownerId)
            return ownerId == fanId ? Ok(new { id, claimed = true }) : Conflict();

        // The conditional ownership update prevents two accounts claiming the same
        // guest record. Its installments and audit entry commit in the same transaction.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (db.Database.IsRelational())
        {
            var updated = await db.FundraisingCommitments.Where(c => c.Id == id && c.FanUserId == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(c => c.FanUserId, (Guid?)fanId), ct);
            if (updated == 0)
            {
                var currentOwner = await db.FundraisingCommitments.AsNoTracking().Where(c => c.Id == id).Select(c => c.FanUserId).SingleOrDefaultAsync(ct);
                return currentOwner == fanId ? Ok(new { id, claimed = true }) : Conflict();
            }
            await db.SupporterBricks.Where(b => b.FundraisingCommitmentId == id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(b => b.FanUserId, (Guid?)fanId), ct);
            db.Entry(commitment).State = EntityState.Detached;
        }
        else
        {
            commitment.FanUserId = fanId;
            foreach (var installment in await db.SupporterBricks.Where(b => b.FundraisingCommitmentId == id).ToListAsync(ct))
                installment.FanUserId = fanId;
            await db.SaveChangesAsync(ct);
        }
        await audit.LogAsync("FUNDRAISING_COMMITMENT_CLAIMED", "FundraisingCommitment", id.ToString(),
            fanId.ToString(), null, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Ok(new { id, claimed = true });
    }

    [Authorize(Roles = "Fan")]
    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        if (FanId() is not { } fanId) return Unauthorized();
        var ids = await db.FundraisingCommitments.Where(c => c.FanUserId == fanId).OrderByDescending(c => c.CreatedAt).Select(c => c.Id).ToListAsync(ct);
        var items = new List<object>();
        foreach (var id in ids) if (await FundraisingQueries.Commitment(db, id, ct) is { } item) items.Add(item);
        return Ok(items);
    }

    private Guid? FanId() => User.IsInRole("Fan") && Guid.TryParse(User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;
}

public sealed record JoinFundraisingRequest(Guid ClientRequestId, string AccessToken, string DisplayName,
    decimal MonthlyAmountTnd, string PaymentMethod, string? Phone = null, string? Email = null);
