using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/media")]
public sealed class MediaController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await db.MediaAssets.AsNoTracking().Where(x => x.IsPublished).OrderByDescending(x => x.CreatedAt).Take(50).ToListAsync(ct));
}
