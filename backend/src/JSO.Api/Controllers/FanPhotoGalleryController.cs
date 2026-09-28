using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only community photo gallery (idea A2). Returns ONLY moderated
// (Approved) fan photos, newest first, with a stable shape consumable by both
// the web and Flutter clients.
//
// Privacy: NO PII of the submitting fan is exposed here (no email, no identity,
// not even the FanUserId). Only the media URL, caption and submission date are
// surfaced. Nothing appears until a moderator has approved it.
[ApiController]
[Route("api/fan-photos")]
public sealed class FanPhotoGalleryController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetGallery([FromQuery] int? take, CancellationToken ct)
    {
        var limit = take is > 0 and <= 200 ? take.Value : 60;
        var photos = await db.FanPhotos.AsNoTracking()
            .Where(p => p.Status == "Approved")
            .OrderByDescending(p => p.SubmittedAt)
            .Join(db.MediaAssets.AsNoTracking(), p => p.MediaAssetId, m => m.Id, (p, m) => new
            {
                p.Id,
                Url = m.Url,
                Caption = p.Caption,
                Date = p.SubmittedAt
            })
            .Take(limit)
            .ToListAsync(ct);
        return Ok(photos);
    }
}
