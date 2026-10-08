using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management + moderation for the community classifieds board (idea B6).
// Every route requires the CommunityManager or ClubAdmin role and every write
// is audited. Moderation is mandatory before an ad reaches the public board:
// an ad is created "Pending" and only becomes public once "Approved" (and not
// expired).
//
// Payments are OUT OF SCOPE this iteration: Price is a declared value of the
// item being sold, never a fee we collect. Paid publication fees depend on a
// certified TND payment gateway and are a documented TODO. We never handle
// card data here.
[ApiController]
[Authorize(Roles = "CommunityManager,ClubAdmin")]
[Route("api/admin/classifieds")]
public sealed class AdminClassifiedsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    public static readonly string[] Statuses = ["Pending", "Approved", "Rejected"];

    // Full list across every moderation status, optionally filtered by status
    // and/or category. Admins see the complete record, including contact info
    // and author link, so they can moderate responsibly.
    [HttpGet]
    public async Task<IActionResult> GetAds([FromQuery] string? status, [FromQuery] string? category, CancellationToken ct)
    {
        var query = db.ClassifiedAds.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
        {
            var s = status.Trim();
            query = query.Where(x => x.Status == s);
        }
        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }
        var rows = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAd(ClassifiedAdRequest request, CancellationToken ct)
    {
        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        var ad = new ClassifiedAd
        {
            AuthorFanUserId = request.AuthorFanUserId,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            ContactInfo = string.IsNullOrWhiteSpace(request.ContactInfo) ? null : request.ContactInfo.Trim(),
            ShowContact = request.ShowContact && !string.IsNullOrWhiteSpace(request.ContactInfo),
            ExpiresAt = request.ExpiresAt,
            Status = Statuses.Contains(request.Status) ? request.Status : "Pending"
        };
        db.ClassifiedAds.Add(ad);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ClassifiedAd", ad.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { ad.Title, ad.Category, ad.Status, ad.Price }, ct);
        return Created($"/api/admin/classifieds/{ad.Id}", ad);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAd(Guid id, ClassifiedAdRequest request, CancellationToken ct)
    {
        var ad = await db.ClassifiedAds.FindAsync([id], ct);
        if (ad is null) return NotFound();

        var error = await ValidateAsync(request, ct);
        if (error is not null) return BadRequest(new { message = error });

        ad.AuthorFanUserId = request.AuthorFanUserId;
        ad.Title = request.Title.Trim();
        ad.Body = request.Body.Trim();
        ad.Category = request.Category.Trim();
        ad.Price = request.Price;
        ad.ContactInfo = string.IsNullOrWhiteSpace(request.ContactInfo) ? null : request.ContactInfo.Trim();
        ad.ShowContact = request.ShowContact && !string.IsNullOrWhiteSpace(request.ContactInfo);
        ad.ExpiresAt = request.ExpiresAt;
        if (Statuses.Contains(request.Status)) ad.Status = request.Status;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "ClassifiedAd", ad.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { ad.Title, ad.Category, ad.Status, ad.Price }, ct);
        return Ok(ad);
    }

    // Moderation: approve a pending/rejected ad so it appears on the public board.
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveAd(Guid id, CancellationToken ct) => await SetStatusAsync(id, "Approved", "APPROVE", ct);

    // Moderation: reject an ad, keeping it off the public board.
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectAd(Guid id, CancellationToken ct) => await SetStatusAsync(id, "Rejected", "REJECT", ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAd(Guid id, CancellationToken ct)
    {
        var ad = await db.ClassifiedAds.FindAsync([id], ct);
        if (ad is null) return NotFound();
        db.ClassifiedAds.Remove(ad);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "ClassifiedAd", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private async Task<IActionResult> SetStatusAsync(Guid id, string status, string action, CancellationToken ct)
    {
        var ad = await db.ClassifiedAds.FindAsync([id], ct);
        if (ad is null) return NotFound();
        ad.Status = status;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(action, "ClassifiedAd", ad.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { ad.Title, ad.Status }, ct);
        return Ok(ad);
    }

    private async Task<string?> ValidateAsync(ClassifiedAdRequest r, CancellationToken ct)
    {
        var error = Validate(r.Title, r.Body, r.Category, r.Price, r.ContactInfo);
        if (error is not null) return error;
        if (r.AuthorFanUserId is not null && !await db.FanUsers.AnyAsync(f => f.Id == r.AuthorFanUserId, ct))
            return "Fan user does not exist.";
        return null;
    }

    // Shared validation used by both the admin and the public proposal endpoints.
    internal static string? Validate(string? title, string? body, string? category, decimal? price, string? contactInfo)
    {
        if (string.IsNullOrWhiteSpace(title)) return "Title is required.";
        if (title.Trim().Length > 120) return "Title must be 120 characters or fewer.";
        if (string.IsNullOrWhiteSpace(body)) return "Body is required.";
        if (body.Trim().Length > 4000) return "Body must be 4000 characters or fewer.";
        if (string.IsNullOrWhiteSpace(category)) return "Category is required.";
        if (category.Trim().Length > 60) return "Category must be 60 characters or fewer.";
        if (contactInfo is not null && contactInfo.Trim().Length > 200) return "Contact info must be 200 characters or fewer.";
        if (price is < 0) return "Price cannot be negative.";
        if (price > 1_000_000_000m) return "Price is out of range.";
        return null;
    }
}

public sealed record ClassifiedAdRequest(
    string Title,
    string Body,
    string Category,
    decimal? Price = null,
    string? ContactInfo = null,
    bool ShowContact = false,
    DateTimeOffset? ExpiresAt = null,
    Guid? AuthorFanUserId = null,
    string Status = "Pending");
