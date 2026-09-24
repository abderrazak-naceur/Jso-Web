using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/content")]
public sealed class AdminContentController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.SiteContents.AsNoTracking().OrderBy(x => x.Key).ToListAsync(ct));

    [HttpPut("{key}")]
    public async Task<IActionResult> Upsert(string key, ContentRequest request, CancellationToken ct)
    {
        key = key.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(key) || key.Length > 120)
            return BadRequest(new { message = "Invalid content key." });

        var item = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == key, ct);
        var userId = User.FindFirst("sub")?.Value;
        var userEmail = User.FindFirst("email")?.Value;

        if (item is null)
        {
            item = new SiteContent { Key = key, Value = request.Value ?? "", UpdatedBy = userEmail };
            db.SiteContents.Add(item);
        }
        else
        {
            item.Value = request.Value ?? "";
            item.UpdatedAt = DateTimeOffset.UtcNow;
            item.UpdatedBy = userEmail;
        }

        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "SiteContent", item.Id.ToString(), userId, userEmail, HttpContext.Connection.RemoteIpAddress?.ToString(), new { key }, ct);
        return Ok(item);
    }
}

public sealed record ContentRequest(string? Value);
