using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,FinanceManager")]
[Route("api/admin/donations")]
public sealed class AdminDonationsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var rows = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.Status == "Donation")
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id, x.DisplayName, x.Message, x.Amount, x.PaymentStatus,
                x.PaymentProvider, x.Country, x.ChargedAmount, x.ChargedCurrency, x.CreatedAt, x.PaidAt
            })
            .ToListAsync(ct);

        return Ok(new
        {
            goalTnd = 30000m,
            totalPaidTnd = rows.Where(x => x.PaymentStatus == "Paid").Sum(x => x.Amount),
            pendingTnd = rows.Where(x => x.PaymentStatus != "Paid").Sum(x => x.Amount),
            paidCount = rows.Count(x => x.PaymentStatus == "Paid"),
            pendingCount = rows.Count(x => x.PaymentStatus != "Paid"),
            donations = rows.Take(100)
        });
    }

    [HttpPost("{id:guid}/refund")]
    public async Task<IActionResult> Refund(Guid id, CancellationToken ct)
    {
        // No provider-initiated refund API is exposed by the current payment abstraction.
        // Keep this explicit rather than pretending a local status change is a bank refund.
        var donation = await db.SupporterBricks.SingleOrDefaultAsync(x => x.Id == id && x.Status == "Donation", ct);
        if (donation is null) return NotFound();
        if (donation.PaymentStatus != "Paid") return BadRequest(new { message = "Cette contribution n'est pas réglée." });

        await audit.LogAsync("DONATION_REFUND_REQUEST", "SupporterBrick", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { donation.PaymentProvider }, ct);

        return StatusCode(StatusCodes.Status409Conflict,
            new { message = "Le remboursement doit être effectué depuis le prestataire de paiement. La plateforme n'effectue aucun faux remboursement local." });
    }
}
