using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Fan-facing GDPR self-service centre (idea E17): the authenticated fan can
// download a copy of their own personal data (right of access / portability)
// and request the deletion of their account (right to erasure).
//
// Security / privacy invariants:
//  - Every route requires the "Fan" role; admin tokens (which never carry the
//    "Fan" role) cannot reach these endpoints.
//  - The fan acts ONLY on their own data: the FanUserId is always resolved from
//    the authenticated token claim, never from client input, so one fan can
//    never export or delete another fan's data.
//  - Both actions are audited.
//  - Deletion anonymises/deactivates the account rather than hard-deleting, and
//    is idempotent.
[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/fan")]
public sealed class FanPrivacyController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // Resolve the current fan id from the token. The JWT carries the id in "sub"
    // but ASP.NET may remap it to NameIdentifier, so read whichever is present.
    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private string? CurrentFanEmailClaim() =>
        User.FindFirst("email")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

    // Right of access / portability: return the current fan's personal data
    // inline as a structured JSON payload and record a DataExportRequest for
    // audit. Only data that exists in the current model and belongs to THIS fan
    // is included: the FanUser profile, newsletter subscriptions matching the
    // fan's email or id, supporter bricks linked by FanUserId, and classifieds
    // authored by the fan.
    [HttpGet("data-export")]
    public async Task<IActionResult> ExportMyData(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var fan = await db.FanUsers.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == fanId, ct);
        if (fan is null) return NotFound();

        // Newsletter subscriptions belonging to the fan: linked by FanUserId or
        // by the fan's own email address.
        var email = fan.Email;
        var newsletters = await db.NewsletterSubscriptions.AsNoTracking()
            .Where(n => n.FanUserId == fan.Id || n.Email == email)
            .Select(n => new
            {
                n.Email,
                n.ConfirmedAt,
                n.Unsubscribed,
                n.CreatedAt
            })
            .ToListAsync(ct);

        var bricks = await db.SupporterBricks.AsNoTracking()
            .Where(b => b.FanUserId == fan.Id)
            .Select(b => new
            {
                b.DisplayName,
                b.Message,
                b.Amount,
                b.Status,
                b.PaidAt,
                b.CreatedAt
            })
            .ToListAsync(ct);

        var classifieds = await db.ClassifiedAds.AsNoTracking()
            .Where(c => c.AuthorFanUserId == fan.Id)
            .Select(c => new
            {
                c.Title,
                c.Body,
                c.Category,
                c.Price,
                c.Status,
                c.ContactInfo,
                c.ExpiresAt,
                c.CreatedAt
            })
            .ToListAsync(ct);

        // Record the export for audit/compliance. Produced inline, so it is
        // created already in the terminal "Ready" state.
        var now = DateTimeOffset.UtcNow;
        var request = new DataExportRequest
        {
            FanUserId = fan.Id,
            RequestedAt = now,
            Status = "Ready",
            CompletedAt = now
        };
        db.DataExportRequests.Add(request);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("DATA_EXPORT", "FanUser", fan.Id.ToString(), fan.Id.ToString(),
            fan.Email, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { request.Id, newsletters = newsletters.Count, bricks = bricks.Count, classifieds = classifieds.Count }, ct);

        return Ok(new
        {
            exportId = request.Id,
            generatedAt = now,
            profile = new
            {
                fan.Id,
                fan.Email,
                fan.DisplayName,
                fan.EmailVerified,
                fan.IsActive,
                fan.CreatedAt,
                fan.LastLoginAt
            },
            newsletterSubscriptions = newsletters,
            supporterBricks = bricks,
            classifiedAds = classifieds
        });
    }

    // Right to erasure: record the request and anonymise/deactivate the account.
    // Idempotent: if the account is already anonymised (inactive), a repeated
    // call confirms the existing state without changing data again.
    [HttpPost("account-deletion")]
    public async Task<IActionResult> DeleteMyAccount(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var fan = await db.FanUsers.SingleOrDefaultAsync(x => x.Id == fanId, ct);
        if (fan is null) return NotFound();

        var emailForAudit = CurrentFanEmailClaim() ?? fan.Email;
        var alreadyAnonymised = !fan.IsActive;
        var now = DateTimeOffset.UtcNow;

        if (!alreadyAnonymised)
        {
            // Anonymise: replace email with a non-reversible placeholder unique
            // to this account, clear the password hash, neutralise the display
            // name and deactivate. The row is retained (not hard-deleted) so
            // audit and referential history stay intact.
            fan.Email = $"deleted+{fan.Id:N}@deleted.local";
            fan.PasswordHash = string.Empty;
            fan.DisplayName = "Utilisateur supprimé";
            fan.EmailVerified = false;
            fan.IsActive = false;
        }

        var request = new AccountDeletionRequest
        {
            FanUserId = fan.Id,
            RequestedAt = now,
            Status = "Completed",
            CompletedAt = now
        };
        db.AccountDeletionRequests.Add(request);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("ACCOUNT_DELETION", "FanUser", fan.Id.ToString(), fan.Id.ToString(),
            emailForAudit, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { request.Id, alreadyAnonymised }, ct);

        return Ok(new
        {
            message = "Votre compte a été anonymisé et désactivé conformément à votre demande.",
            requestId = request.Id,
            status = request.Status
        });
    }
}
