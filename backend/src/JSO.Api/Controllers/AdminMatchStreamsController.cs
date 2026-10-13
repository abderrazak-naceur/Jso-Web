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
        var rows = await db.MatchStreams.AsNoTracking().OrderByDescending(x => x.StartsAt)
            .Select(x => new { x.Id, x.MatchId, x.Provider, x.StreamUrl, x.IsPaid, x.Price, x.Currency, x.StartsAt, x.EndsAt, x.IsPublished })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPut("{matchId:guid}")]
    public async Task<IActionResult> Upsert(Guid matchId, [FromBody] AdminMatchStreamRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct))
            return NotFound(new { message = "La partita selezionata non esiste." });

        var provider = string.IsNullOrWhiteSpace(request.Provider) ? "Livepeer" : request.Provider.Trim();
        if (!provider.Equals("Mux", StringComparison.OrdinalIgnoreCase) && !provider.Equals("Livepeer", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Provider non supportato. Usa Livepeer o Mux." });

        var playbackUrl = request.StreamUrl?.Trim();
        if (request.IsPublished && string.IsNullOrWhiteSpace(playbackUrl))
            return BadRequest(new { message = "Inserisci il Playback URL prima di pubblicare la diretta." });
        if (!string.IsNullOrWhiteSpace(playbackUrl) && !IsValidPlaybackUrl(provider, playbackUrl))
        {
            var example = provider.Equals("Mux", StringComparison.OrdinalIgnoreCase) ? "https://player.mux.com/PLAYBACK_ID" : "https://lvpr.tv/?v=PLAYBACK_ID";
            return BadRequest(new { message = $"URL di riproduzione non valido per {provider}. Usa {example}." });
        }
        if (request.IsPaid && request.Price <= 0)
            return BadRequest(new { message = "Il prezzo deve essere maggiore di zero per una diretta a pagamento." });

        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null) { stream = new MatchStream { MatchId = matchId }; db.MatchStreams.Add(stream); }
        stream.Provider = provider.Equals("Mux", StringComparison.OrdinalIgnoreCase) ? "Mux" : "Livepeer";
        stream.StreamUrl = playbackUrl;
        stream.IsPaid = request.IsPaid;
        stream.Price = request.IsPaid ? request.Price : 0;
        stream.Currency = string.Equals(request.Currency, "EUR", StringComparison.OrdinalIgnoreCase) ? "EUR" : "TND";
        stream.StartsAt = request.StartsAt;
        stream.EndsAt = request.EndsAt;
        stream.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        return Ok(new { stream.Id, stream.MatchId, stream.Provider, stream.StreamUrl, stream.IsPaid, stream.Price, stream.Currency, stream.StartsAt, stream.EndsAt, stream.IsPublished });
    }

    private static bool IsValidPlaybackUrl(string provider, string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) return false;
        if (provider.Equals("Mux", StringComparison.OrdinalIgnoreCase))
            return string.Equals(uri.Host, "player.mux.com", StringComparison.OrdinalIgnoreCase);
        return string.Equals(uri.Host, "lvpr.tv", StringComparison.OrdinalIgnoreCase) && uri.AbsolutePath == "/" &&
            !string.IsNullOrWhiteSpace(Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query)["v"]);
    }
}

public sealed record AdminMatchStreamRequest(string? Provider, string? StreamUrl, bool IsPaid, decimal Price, string? Currency, DateTimeOffset? StartsAt, DateTimeOffset? EndsAt, bool IsPublished);
