using JSO.Infrastructure;
using JSO.Infrastructure.Social;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin social publishing. Currently supports auto-posting a published article
// to the club's Facebook Page. Auto-posting only works once a Page access token
// is configured (Social:Facebook:*); until then the endpoint returns a clear
// 400 and the admin UI falls back to the manual Facebook sharer. Every attempt
// is audited.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor,CommunityManager")]
[Route("api/admin/social")]
public sealed class AdminSocialController(JsoDbContext db, AuditService audit, FacebookPublisher facebook) : ControllerBase
{
    // Whether auto-publishing is available, so the UI can adapt if needed.
    [HttpGet("facebook/status")]
    public IActionResult FacebookStatus() => Ok(new { configured = facebook.IsConfigured });

    [HttpPost("facebook/publish")]
    public async Task<IActionResult> PublishToFacebook(FacebookPublishRequest request, CancellationToken ct)
    {
        var article = await db.Articles.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.ArticleId, ct);
        if (article is null) return NotFound();
        if (article.Status != "Published")
            return BadRequest(new { message = "Seuls les articles publiés peuvent être partagés sur Facebook." });

        var result = await facebook.PublishArticleAsync(article.Title, article.Excerpt, article.Slug, ct);
        if (!result.Success)
        {
            // NotConfigured and provider refusals are expected states, not server
            // errors: return 400 so the client can fall back to manual sharing.
            return BadRequest(new { message = result.Message, notConfigured = result.NotConfigured });
        }

        await audit.LogAsync("PUBLISH_FACEBOOK", "Article", article.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { result.PostId }, ct);
        return Ok(new { message = result.Message, postId = result.PostId });
    }
}

public sealed record FacebookPublishRequest(Guid ArticleId);
