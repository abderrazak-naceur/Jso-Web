using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only feed of downloadable club documents (comuniqués,
// règlements, formulaires). Returns only published documents, newest first,
// with an optional category filter. The shape is stable and consumable by web
// and Flutter clients.
[ApiController]
[Route("api/documents")]
public sealed class DocumentsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetDocuments([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.ClubDocuments.AsNoTracking().Where(x => x.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var items = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Category,
                x.FileUrl,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }
}
