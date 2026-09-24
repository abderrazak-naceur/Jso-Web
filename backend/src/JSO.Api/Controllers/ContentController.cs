using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/content")]
public sealed class ContentController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var content = await db.SiteContents.AsNoTracking().ToDictionaryAsync(x => x.Key, x => x.Value, ct);
        return Ok(content);
    }
}
