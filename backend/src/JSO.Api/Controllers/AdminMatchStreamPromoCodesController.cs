using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/admin/match-streams/{matchId:guid}/promo-codes")]
[Authorize(Roles = "Developer,Admin,SuperAdmin")]
public sealed class AdminMatchStreamPromoCodesController(JsoDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(Guid matchId, CancellationToken ct)
    {
        var stream = await db.MatchStreams.AsNoTracking().SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null) return NotFound(new { message = "La diretta della partita non esiste." });
        var rows = await db.MatchStreamPromoCodes.AsNoTracking().Where(x => x.MatchStreamId == stream.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Code, x.DiscountPercent, x.ExpiresAt, x.MaxUses, x.Uses, x.IsEnabled, x.CreatedAt })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid matchId, [FromBody] PromoCodeRequest request, CancellationToken ct)
    {
        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId, ct);
        if (stream is null) return NotFound(new { message = "Configura prima la diretta per questa partita." });
        var code = Normalize(request.Code);
        if (code.Length is < 3 or > 40 || code.Any(ch => !char.IsAsciiLetterOrDigit(ch) && ch != '-' && ch != '_'))
            return BadRequest(new { message = "Il codice deve contenere 3-40 caratteri: lettere, numeri, trattino o underscore." });
        if (request.DiscountPercent is < 1 or > 100)
            return BadRequest(new { message = "Lo sconto deve essere compreso tra 1% e 100%." });
        if (request.MaxUses is <= 0)
            return BadRequest(new { message = "Il limite utilizzi deve essere maggiore di zero." });
        if (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTimeOffset.UtcNow)
            return BadRequest(new { message = "La scadenza deve essere futura." });
        if (await db.MatchStreamPromoCodes.AnyAsync(x => x.MatchStreamId == stream.Id && x.Code == code, ct))
            return Conflict(new { message = "Questo codice esiste già per la partita selezionata." });

        var item = new MatchStreamPromoCode { MatchStreamId = stream.Id, Code = code,
            DiscountPercent = request.DiscountPercent, ExpiresAt = request.ExpiresAt,
            MaxUses = request.MaxUses, IsEnabled = request.IsEnabled };
        db.MatchStreamPromoCodes.Add(item);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(List), new { matchId }, new { item.Id, item.Code, item.DiscountPercent, item.ExpiresAt, item.MaxUses, item.Uses, item.IsEnabled, item.CreatedAt });
    }

    [HttpPut("{promoId:guid}")]
    public async Task<IActionResult> Update(Guid matchId, Guid promoId, [FromBody] PromoCodeUpdateRequest request, CancellationToken ct)
    {
        var item = await db.MatchStreamPromoCodes.Include(x => x.MatchStream)
            .SingleOrDefaultAsync(x => x.Id == promoId && x.MatchStream != null && x.MatchStream.MatchId == matchId, ct);
        if (item is null) return NotFound();
        if (request.DiscountPercent is < 1 or > 100 || request.MaxUses is <= 0 || (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTimeOffset.UtcNow))
            return BadRequest(new { message = "Controlla percentuale, limite utilizzi e scadenza." });
        if (request.MaxUses is not null && request.MaxUses < item.Uses)
            return BadRequest(new { message = "Il limite non può essere inferiore agli utilizzi già effettuati." });
        item.DiscountPercent = request.DiscountPercent;
        item.ExpiresAt = request.ExpiresAt;
        item.MaxUses = request.MaxUses;
        item.IsEnabled = request.IsEnabled;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{promoId:guid}")]
    public async Task<IActionResult> Delete(Guid matchId, Guid promoId, CancellationToken ct)
    {
        var item = await db.MatchStreamPromoCodes.Include(x => x.MatchStream)
            .SingleOrDefaultAsync(x => x.Id == promoId && x.MatchStream.MatchId == matchId, ct);
        if (item is null) return NotFound();
        db.MatchStreamPromoCodes.Remove(item);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string Normalize(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();
}

public sealed record PromoCodeRequest(string? Code, int DiscountPercent, DateTimeOffset? ExpiresAt, int? MaxUses, bool IsEnabled);
public sealed record PromoCodeUpdateRequest(int DiscountPercent, DateTimeOffset? ExpiresAt, int? MaxUses, bool IsEnabled);
