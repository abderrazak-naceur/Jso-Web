using System.Security.Claims;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/translations")]
public sealed class AdminTranslationsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? entityType, [FromQuery] Guid? entityId, [FromQuery] string? language, CancellationToken ct)
    {
        var query = db.SiteContents.AsNoTracking().Where(x => x.Key.StartsWith("i18n:"));

        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(x => x.Key.StartsWith("i18n:" + entityType.Trim() + ":", StringComparison.OrdinalIgnoreCase));

        if (entityId.HasValue)
            query = query.Where(x => x.Key.Contains(":" + entityId.Value + ":", StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrWhiteSpace(language))
            query = query.Where(x => x.Key.Contains(":" + ContentTranslationService.NormalizeLanguage(language) + ":", StringComparison.OrdinalIgnoreCase));

        var rows = await query.OrderBy(x => x.Key).ToListAsync(ct);
        return Ok(rows.Select(x => new { x.Id, x.Key, x.Value, x.UpdatedAt, x.UpdatedBy }));
    }

    [HttpPut("{entityType}/{entityId:guid}/{language}/{field}")]
    public async Task<IActionResult> Upsert(string entityType, Guid entityId, string language, string field, TranslationRequest request, CancellationToken ct)
    {
        entityType = entityType.Trim();
        field = field.Trim();
        language = ContentTranslationService.NormalizeLanguage(language);

        if (string.IsNullOrWhiteSpace(entityType) || entityType.Length > 64
            || string.IsNullOrWhiteSpace(field) || field.Length > 64)
            return BadRequest(new { message = "Invalid translation identity." });

        if (request.Value is { Length: > 200000 })
            return BadRequest(new { message = "Translation is too large." });

        var key = ContentTranslationService.Key(entityType, entityId, language, field);
        var item = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == key, ct);
        var userId = User.FindFirst("sub")?.Value;
        var userEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.FindFirst("email")?.Value;

        if (item is null)
        {
            item = new JSO.Domain.SiteContent
            {
                Key = key,
                Value = request.Value ?? string.Empty,
                UpdatedBy = userEmail
            };
            db.SiteContents.Add(item);
        }
        else
        {
            item.Value = request.Value ?? string.Empty;
            item.UpdatedAt = DateTimeOffset.UtcNow;
            item.UpdatedBy = userEmail;
        }

        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Translation", item.Id.ToString(), userId, userEmail,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { entityType, entityId, language, field }, ct);

        return Ok(new { item.Id, item.Key, item.Value, item.UpdatedAt, item.UpdatedBy });
    }

    [HttpDelete("{entityType}/{entityId:guid}/{language}/{field}")]
    public async Task<IActionResult> Delete(string entityType, Guid entityId, string language, string field, CancellationToken ct)
    {
        language = ContentTranslationService.NormalizeLanguage(language);
        var key = ContentTranslationService.Key(entityType.Trim(), entityId, language, field.Trim());
        var item = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == key, ct);
        if (item is null) return NoContent();

        db.SiteContents.Remove(item);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record TranslationRequest(string? Value);
