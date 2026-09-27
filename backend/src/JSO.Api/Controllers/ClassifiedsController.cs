using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only community classifieds board (idea B6).
// Returns ONLY moderated (Approved) ads that have not expired (ExpiresAt null
// or in the future), newest first, with an optional category filter. The shape
// is stable and consumable by both the web and Flutter clients.
//
// Privacy: contact details are surfaced ONLY when the author consented
// (ShowContact == true). AuthorFanUserId, moderation status and internal
// timestamps are never exposed here.
//
// A fan/public proposal endpoint creates ads in the "Pending" state; they stay
// invisible until a CommunityManager/ClubAdmin approves them. No payment is
// processed: Price is a declared value of the item, not a collected fee
// (TODO payments, see BUSINESS_PLAN / ClassifiedAd).
[ApiController]
[Route("api/classifieds")]
public sealed class ClassifiedsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublic([FromQuery] string? category, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var query = db.ClassifiedAds.AsNoTracking()
            .Where(x => x.Status == "Approved")
            .Where(x => x.ExpiresAt == null || x.ExpiresAt > now);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var ads = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Body,
                x.Category,
                x.Price,
                // Contact surfaced only with explicit consent.
                ContactInfo = x.ShowContact ? x.ContactInfo : null,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(ads);
    }

    // Public proposal endpoint: anyone can propose an ad which is created in the
    // "Pending" state and stays invisible until moderated. We never reveal other
    // authors' data and we never process a payment here.
    [HttpPost]
    public async Task<IActionResult> Propose(ClassifiedAdProposal request, CancellationToken ct)
    {
        var error = AdminClassifiedsController.Validate(
            request.Title, request.Body, request.Category, request.Price, request.ContactInfo);
        if (error is not null) return BadRequest(new { message = error });

        var ad = new ClassifiedAd
        {
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Category = request.Category.Trim(),
            Price = request.Price,
            ContactInfo = string.IsNullOrWhiteSpace(request.ContactInfo) ? null : request.ContactInfo.Trim(),
            // Contact shown publicly only when the author explicitly consents.
            ShowContact = request.ShowContact && !string.IsNullOrWhiteSpace(request.ContactInfo),
            ExpiresAt = request.ExpiresAt,
            // Moderation mandatory before publication.
            Status = "Pending"
        };
        db.ClassifiedAds.Add(ad);
        await db.SaveChangesAsync(ct);

        // Return only a minimal acknowledgement, never the internal status or
        // identifiers that could leak the moderation pipeline.
        return Accepted(new { message = "Annonce reçue. Elle sera visible après modération." });
    }
}

public sealed record ClassifiedAdProposal(
    string Title,
    string Body,
    string Category,
    decimal? Price = null,
    string? ContactInfo = null,
    bool ShowContact = false,
    DateTimeOffset? ExpiresAt = null);
