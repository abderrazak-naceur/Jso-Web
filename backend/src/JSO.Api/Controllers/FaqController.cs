using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only FAQ feed. Returns only published entries ordered by
// SortOrder then CreatedAt, with an optional ?category= filter. The shape is
// stable and consumable by web and Flutter clients.
[ApiController]
[Route("api/faq")]
public sealed class FaqController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFaq([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.FaqEntries.AsNoTracking().Where(x => x.IsPublished);

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        var items = await query
            .OrderBy(x => x.SortOrder).ThenBy(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.Question,
                x.Answer,
                x.Category,
                x.SortOrder
            })
            .ToListAsync(ct);

        return Ok(items);
    }
}
