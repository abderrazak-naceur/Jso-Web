using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only feed of community programs with local schools and partner
// clubs (idea G23). Returns only published programs, ordered by start date.
//
// Privacy: the partner ContactEmail is intentionally NOT part of the public
// projection. Only Title, PartnerName, Description and dates are exposed. The
// shape is stable and consumable by web and Flutter clients.
[ApiController]
[Route("api/community-programs")]
public sealed class CommunityProgramsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPrograms(CancellationToken ct)
    {
        var items = await db.CommunityPrograms.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.StartDate)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.PartnerName,
                x.Description,
                x.StartDate,
                x.EndDate
            })
            .ToListAsync(ct);

        return Ok(items);
    }
}
