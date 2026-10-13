using System.Security.Claims;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

/// <summary>Unified, owner-scoped payment history for the signed-in fan.</summary>
[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/account/me/payments")]
public sealed class MyPaymentsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var subject = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(subject, out var fanId)) return Unauthorized();

        var tickets = await db.TicketOrders.AsNoTracking().Where(x => x.FanUserId == fanId)
            .Select(x => new PaymentHistoryItem(x.Id, "ticket", "Billet · " + x.TicketTypeName,
                x.Status, x.ChargedAmount ?? x.Total, x.ChargedCurrency ?? x.Currency,
                x.PaymentProvider, x.CreatedAt, x.PaidAt))
            .ToListAsync(ct);
        var orders = await db.Orders.AsNoTracking().Where(x => x.FanUserId == fanId)
            .Select(x => new PaymentHistoryItem(x.Id, "shop", "Commande boutique",
                x.Status, x.ChargedAmount ?? x.Total, x.ChargedCurrency ?? x.Currency,
                x.PaymentProvider, x.CreatedAt, x.PaidAt))
            .ToListAsync(ct);
        var memberships = await db.Memberships.AsNoTracking().Where(x => x.FanUserId == fanId)
            .Join(db.MembershipPlans.AsNoTracking(), x => x.MembershipPlanId, p => p.Id,
                (x, p) => new PaymentHistoryItem(x.Id, "membership", "Abonnement · " + p.Name,
                    x.PaymentStatus, x.ChargedAmount ?? x.Price, x.ChargedCurrency ?? x.Currency,
                    x.PaymentProvider, x.CreatedAt, x.PaidAt))
            .ToListAsync(ct);
        var streams = await db.MatchStreamAccesses.AsNoTracking().Where(x => x.FanUserId == fanId)
            .Join(db.MatchStreams.AsNoTracking(), x => x.MatchStreamId, s => s.Id,
                (x, s) => new { x, s })
            .Join(db.Matches.AsNoTracking(), pair => pair.s.MatchId, m => m.Id,
                (pair, m) => new PaymentHistoryItem(pair.x.Id, "stream", "Direct · JSO vs " + m.OpponentName,
                    pair.x.Status, pair.x.ChargedAmount ?? pair.s.Price,
                    pair.x.ChargedCurrency ?? pair.s.Currency, pair.x.PaymentProvider,
                    pair.x.CreatedAt, pair.x.PaidAt))
            .ToListAsync(ct);
        var donations = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.FanUserId == fanId && x.Status == "Donation")
            .Select(x => new PaymentHistoryItem(x.Id, "donation", "Don à la JSO",
                x.PaymentStatus, x.ChargedAmount ?? x.Amount, x.ChargedCurrency ?? "TND",
                x.PaymentProvider, x.CreatedAt, x.PaidAt))
            .ToListAsync(ct);

        var history = tickets.Concat(orders).Concat(memberships).Concat(streams).Concat(donations)
            .OrderByDescending(x => x.PaidAt ?? x.CreatedAt)
            .ToList();
        return Ok(history);
    }
}

public sealed record PaymentHistoryItem(
    Guid Id,
    string Type,
    string Description,
    string Status,
    decimal Amount,
    string Currency,
    string? Provider,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt);
