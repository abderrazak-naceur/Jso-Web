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
public sealed class CommunityProgramsController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPrograms(CancellationToken ct)
    {
        var entities = await db.CommunityPrograms.AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderBy(x => x.StartDate)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("CommunityProgram", entities.Select(x => x.Id), ["title", "partnername", "description"], language, ct);
        return Ok(entities.Select(x => new
        {
            x.Id,
            Title = ContentTranslationService.ResolveFromMap(map, "CommunityProgram", x.Id, "title", x.Title, language),
            PartnerName = ContentTranslationService.ResolveFromMap(map, "CommunityProgram", x.Id, "partnername", x.PartnerName, language),
            Description = ContentTranslationService.ResolveFromMap(map, "CommunityProgram", x.Id, "description", x.Description, language),
            x.StartDate, x.EndDate
        }));
    }
}
