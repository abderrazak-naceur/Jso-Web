using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/match-streams")]
[Authorize(Roles = "Developer,Admin,SuperAdmin")]
public sealed class AdminMatchStreamsController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var rows = await db.MatchStreams.AsNoTracking()
            .OrderByDescending(x => x.StartsAt)
            .Select(x => new
            {
                x.Id, x.MatchId, x.Provider, x.StreamUrl, x.IsPaid, x.Price,
                x.Currency, x.StartsAt, x.EndsAt, x.IsPublished
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPut("{matchId:guid}")]
    public async Task<IActionResult> Upsert(Guid matchId, [FromBody] AdminMatchStreamRequest request, CancellationToken ct)
    {
        var matchExists = await db.Matches.AnyAsync(x => x.Id == matchId, ct);
        if (!matchExists) return NotFound(new { message = "La partita selezionata non esiste." });

        var provider = string.IsNullOrWhiteSpace(request.Provider) ? "Mux" : request.Provider.Trim();
        if (!string.Equals(provider, "Mux", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Per questa schermata è supportato soltanto Mux." });

        var playbackUrl = request.StreamUrl?.Trim();
        if (request.IsPublished && string.IsNullOrWhiteSpace(playbackUrl))
            return BadRequest(new { message = "Inserisci il Playback URL prima di pubblicare la diretta." });

        if (!string.IsNullOrWhiteSpace(playbackUrl) &&
            (!Uri.TryCreate(playbackUrl, UriKind.Absolute, out var uri) ||
             uri.Scheme != Uri.UriSchemeHttps ||
             !string.Equals(uri.Host, "player.mux.com", StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new { message = "Usa l'URL HTTPS del player Mux, ad esempio https://player.mux.com/PLAYBACK_ID." });

        if (request.IsPaid && request.Price <= 0)
            return BadRequest(new { message = "Il prezzo deve essere maggiore di zero per una diretta a pagamento." });

        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null)
        {
            stream = new MatchStream { MatchId = matchId };
            db.MatchStreams.Add(stream);
        }

        stream.Provider = "Mux";
        stream.StreamUrl = playbackUrl;
        stream.IsPaid = request.IsPaid;
        stream.Price = request.IsPaid ? request.Price : 0;
        stream.Currency = string.Equals(request.Currency, "EUR", StringComparison.OrdinalIgnoreCase) ? "EUR" : "TND";
        stream.StartsAt = request.StartsAt;
        stream.EndsAt = request.EndsAt;
        stream.IsPublished = request.IsPublished;

        await db.SaveChangesAsync(ct);
        return Ok(new
        {
            stream.Id, stream.MatchId, stream.Provider, stream.StreamUrl, stream.IsPaid,
            stream.Price, stream.Currency, stream.StartsAt, stream.EndsAt, stream.IsPublished
        });
    }
}

public sealed record AdminMatchStreamRequest(
    string? Provider,
    string? StreamUrl,
    bool IsPaid,
    decimal Price,
    string? Currency,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt,
    bool IsPublished);
