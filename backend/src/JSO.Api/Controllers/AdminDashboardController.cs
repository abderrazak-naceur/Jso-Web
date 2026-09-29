using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor,MatchManager,CommunityManager,ShopManager")]
[Route("api/admin")]
public sealed class AdminDashboardController(JsoDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var startOfDay = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);

        // Security note: the dashboard is authorized to a broad role set (see [Authorize] above),
        // so it must NOT leak the sensitive audit fields (IpAddress / Details). The full audit log
        // stays exclusive to the SuperAdmin-only AdminAuditController (/api/admin/audit). Here we
        // expose only a SAFE, synthetic projection of the last audit events (id, action, entityType,
        // entityId, userEmail, createdAt) via the .Select(...) below so excluded columns never serialize.
        var recentActivity = await db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(10)
            .Select(x => new
            {
                id = x.Id,
                action = x.Action,
                entityType = x.EntityType,
                entityId = x.EntityId,
                userEmail = x.UserEmail,
                createdAt = x.CreatedAt
            })
            .ToListAsync(ct);

        var todayActivity = new
        {
            newsPublished = await db.Articles.CountAsync(
                x => x.Status == "Published" && x.PublishedAt != null && x.PublishedAt >= startOfDay, ct),
            matchesToday = await db.Matches.CountAsync(
                x => x.KickoffAt >= startOfDay && x.KickoffAt < startOfDay.AddDays(1), ct),
            mediaUploaded = await db.MediaAssets.CountAsync(x => x.CreatedAt >= startOfDay, ct),
            auditActions = await db.AuditLogs.CountAsync(x => x.CreatedAt >= startOfDay, ct)
        };

        var result = new
        {
            matches = new
            {
                upcoming = await db.Matches.CountAsync(x => x.IsPublished && x.KickoffAt >= now, ct),
                finished = await db.Matches.CountAsync(x => x.IsPublished && x.Status == "Finished", ct)
            },
            news = new
            {
                published = await db.Articles.CountAsync(x => x.Status == "Published", ct),
                drafts = await db.Articles.CountAsync(x => x.Status == "Draft", ct)
            },
            teams = await db.Teams.CountAsync(x => x.IsActive, ct),
            players = await db.Players.CountAsync(x => x.IsActive, ct),
            todayActivity,
            recentActivity,
            // Real sales metrics from paid boutique orders (Paid/Shipped/
            // Delivered count as revenue). "enabled" reflects that there is at
            // least one active product to sell; revenue/orders stay 0 until real
            // orders are paid.
            sales = await BuildSalesAsync(db, ct),
            // Ticketing revenue: an order counts as sold once Confirmed (and
            // stays counted after check-in). Pending/Cancelled are excluded.
            tickets = await BuildTicketsAsync(db, ct),
            // Membership revenue: paid subscriptions; "active" uses the same
            // rule as entitlement reads (Active status within its window).
            memberships = await BuildMembershipsAsync(db, now, ct)
        };

        return Ok(result);
    }

    private static readonly string[] SoldTicketStatuses = ["Confirmed", "CheckedIn"];

    private static async Task<object> BuildTicketsAsync(JsoDbContext db, CancellationToken ct)
    {
        var sold = db.TicketOrders.AsNoTracking().Where(x => SoldTicketStatuses.Contains(x.Status));
        return new
        {
            currency = "TND",
            revenue = await sold.SumAsync(x => (decimal?)x.Total, ct) ?? 0m,
            orders = await sold.CountAsync(ct),
            ticketsSold = await sold.SumAsync(x => (int?)x.Quantity, ct) ?? 0,
            pending = await db.TicketOrders.AsNoTracking().CountAsync(x => x.Status == "Pending", ct)
        };
    }

    private static async Task<object> BuildMembershipsAsync(JsoDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var paid = db.Memberships.AsNoTracking().Where(x => x.PaymentStatus == "Paid");
        // Currently-active = Active status whose window has not elapsed (mirrors
        // MembershipStatus.IsCurrentlyActive, expressed so EF can translate it).
        var active = await db.Memberships.AsNoTracking()
            .CountAsync(x => x.Status == "Active" && (x.EndsAt == null || x.EndsAt > now), ct);
        return new
        {
            currency = "TND",
            revenue = await paid.SumAsync(x => (decimal?)x.Price, ct) ?? 0m,
            active,
            total = await db.Memberships.AsNoTracking().CountAsync(ct)
        };
    }

    private static readonly string[] PaidStatuses = ["Paid", "Shipped", "Delivered"];

    private static async Task<object> BuildSalesAsync(JsoDbContext db, CancellationToken ct)
    {
        var paidOrders = db.Orders.AsNoTracking().Where(x => PaidStatuses.Contains(x.Status));
        var revenue = await paidOrders.SumAsync(x => (decimal?)x.Total, ct) ?? 0m;
        var orders = await paidOrders.CountAsync(ct);
        var paidOrderIds = paidOrders.Select(x => x.Id);
        var productsSold = await db.OrderItems.AsNoTracking()
            .Where(x => paidOrderIds.Contains(x.OrderId))
            .SumAsync(x => (int?)x.Quantity, ct) ?? 0;

        return new
        {
            enabled = await db.Products.AnyAsync(x => x.IsActive, ct),
            currency = "TND",
            revenue,
            orders,
            activeProducts = await db.Products.CountAsync(x => x.IsActive, ct),
            productsSold,
            conversionRate = 0d
        };
    }
}
