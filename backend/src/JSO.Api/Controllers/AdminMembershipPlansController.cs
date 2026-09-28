using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management for supporter membership plans (idea B: monetisation).
// Every route requires the ClubAdmin or SuperAdmin role and every write is
// audited. Also exposes a read-only list of memberships (subscriptions) for
// oversight. No card data is ever handled here; a membership becomes Active only
// via the verified payment webhook.
[ApiController]
[Authorize(Roles = "ClubAdmin,SuperAdmin")]
[Route("api/admin/membership-plans")]
public sealed class AdminMembershipPlansController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var plans = await db.MembershipPlans.AsNoTracking()
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Price)
            .ToListAsync(ct);
        return Ok(plans);
    }

    [HttpPost]
    public async Task<IActionResult> Create(MembershipPlanRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var plan = new MembershipPlan
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant(),
            DurationDays = request.DurationDays,
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder,
        };
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "MembershipPlan", plan.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { plan.Name, plan.Price, plan.DurationDays, plan.IsActive }, ct);
        return Created($"/api/admin/membership-plans/{plan.Id}", plan);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, MembershipPlanRequest request, CancellationToken ct)
    {
        var plan = await db.MembershipPlans.FindAsync([id], ct);
        if (plan is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        plan.Name = request.Name.Trim();
        plan.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        plan.Price = request.Price;
        plan.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant();
        plan.DurationDays = request.DurationDays;
        plan.IsActive = request.IsActive;
        plan.DisplayOrder = request.DisplayOrder;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MembershipPlan", plan.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { plan.Name, plan.Price, plan.DurationDays, plan.IsActive }, ct);
        return Ok(plan);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var plan = await db.MembershipPlans.FindAsync([id], ct);
        if (plan is null) return NotFound();
        // Preserve historical memberships: block deletion when subscriptions
        // reference the plan; deactivate instead.
        if (await db.Memberships.AnyAsync(m => m.MembershipPlanId == id, ct))
            return BadRequest(new { message = "Impossible de supprimer un abonnement déjà souscrit. Désactivez-le plutôt." });
        db.MembershipPlans.Remove(plan);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MembershipPlan", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    // Read-only oversight of subscriptions across all fans.
    [HttpGet("/api/admin/memberships")]
    public async Task<IActionResult> GetMemberships([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.Memberships.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(x => x.Status == s);
        }
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .Join(db.MembershipPlans.AsNoTracking(), m => m.MembershipPlanId, p => p.Id, (m, p) => new
            {
                m.Id, m.FanUserId, m.MembershipPlanId, PlanName = p.Name, m.Price, m.Currency,
                m.Status, m.PaymentStatus, m.StartsAt, m.EndsAt, m.PaymentProvider, m.Country, m.CreatedAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    private static string? Validate(MembershipPlanRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) return "Le nom de l'abonnement est requis.";
        if (r.Name.Trim().Length > 120) return "Le nom ne peut pas dépasser 120 caractères.";
        if (r.Description is not null && r.Description.Trim().Length > 1000) return "La description ne peut pas dépasser 1000 caractères.";
        if (r.Price < 0) return "Le prix ne peut pas être négatif.";
        if (r.Price > 1_000_000_000m) return "Le prix est hors limites.";
        if (r.DurationDays < 1 || r.DurationDays > 3650) return "La durée doit être comprise entre 1 et 3650 jours.";
        return null;
    }
}

public sealed record MembershipPlanRequest(
    string Name,
    string? Description,
    decimal Price,
    int DurationDays,
    string Currency = "TND",
    bool IsActive = true,
    int DisplayOrder = 0);
