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
            // Sales analytics are pre-wired for the future Shop (Horizon 2).
            // No Product/Order entities exist yet, so values stay zero and
            // "enabled" is false until the shop domain and a payment provider
            // are implemented. The dashboard renders a clear "not active" state.
            sales = new
            {
                // Catalog is real; orders/revenue stay zero until checkout + a
                // payment provider exist. "enabled" flags the shop as live once
                // there is at least one active product to sell.
                enabled = await db.Products.AnyAsync(x => x.IsActive, ct),
                currency = "TND",
                revenue = 0m,
                orders = 0,
                activeProducts = await db.Products.CountAsync(x => x.IsActive, ct),
                productsSold = 0,
                conversionRate = 0d
            }
        };

        return Ok(result);
    }
}
