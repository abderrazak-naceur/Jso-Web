using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin configuration of a match's pay-per-view live stream (idea B24). Every
// route requires the MatchManager or ClubAdmin role and every write is audited.
//
// SCOPE: this only configures the paid ACCESS mechanism (provider hint, playback
// link, price, window, isPaid, isPublished). The broadcasting rights and the
// actual stream production (e.g. a YouTube unlisted broadcast) remain the club's
// responsibility (see docs/PAYMENTS.md). No card data is ever handled here.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/matches/{matchId:guid}/stream")]
public sealed class AdminMatchStreamController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // Returns the current stream config for the match (admin view, includes the
    // sensitive StreamUrl), or 204 when no stream is configured yet.
    [HttpGet]
    public async Task<IActionResult> Get(Guid matchId, CancellationToken ct)
    {
        var stream = await db.MatchStreams.AsNoTracking().SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null) return NoContent();
        return Ok(stream);
    }

    // Creates or updates (upsert) the single stream for a match. One stream per
    // match (unique MatchId), so a second POST/PUT updates the existing row.
    [HttpPost]
    [HttpPut]
    public async Task<IActionResult> Upsert(Guid matchId, MatchStreamRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct))
            return NotFound(new { message = "Match introuvable." });

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        var isCreate = stream is null;
        if (stream is null)
        {
            stream = new MatchStream { MatchId = matchId };
            db.MatchStreams.Add(stream);
        }

        stream.Provider = string.IsNullOrWhiteSpace(request.Provider) ? "YouTube" : request.Provider.Trim();
        stream.StreamUrl = string.IsNullOrWhiteSpace(request.StreamUrl) ? null : request.StreamUrl.Trim();
        stream.IsPaid = request.IsPaid;
        stream.Price = request.IsPaid ? request.Price : 0m;
        stream.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant();
        stream.StartsAt = request.StartsAt;
        stream.EndsAt = request.EndsAt;
        stream.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(isCreate ? "CREATE" : "UPDATE", "MatchStream", stream.Id.ToString(),
            User.FindFirst("sub")?.Value, User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { stream.MatchId, stream.Provider, stream.IsPaid, stream.Price, stream.IsPublished }, ct);
        return isCreate ? Created($"/api/admin/matches/{matchId}/stream", stream) : Ok(stream);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(Guid matchId, CancellationToken ct)
    {
        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null) return NotFound();
        db.MatchStreams.Remove(stream);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MatchStream", stream.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(MatchStreamRequest r)
    {
        if (r.IsPaid && r.Price <= 0) return "Le prix d'un accès payant doit être supérieur à zéro.";
        if (r.Price < 0) return "Le prix ne peut pas être négatif.";
        if (r.Price > 1_000_000_000m) return "Le prix est hors limites.";
        if (r.StreamUrl is not null && r.StreamUrl.Trim().Length > 2000) return "Le lien du flux est trop long.";
        if (r.Provider is not null && r.Provider.Trim().Length > 40) return "Le nom du fournisseur est trop long.";
        if (r.StartsAt is not null && r.EndsAt is not null && r.EndsAt < r.StartsAt)
            return "La fin de la diffusion ne peut pas précéder son début.";
        return null;
    }
}

public sealed record MatchStreamRequest(
    string? Provider,
    string? StreamUrl,
    bool IsPaid,
    decimal Price,
    DateTimeOffset? StartsAt = null,
    DateTimeOffset? EndsAt = null,
    string Currency = "TND",
    bool IsPublished = false);
