using JSO.Domain;
using JSO.Infrastructure;
using JSO.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers.Admin.Commerce;

[ApiController]
[Authorize(Policy = AdminPermissions.TicketsAdmin)]
[Route("api/admin/tickets/promo-codes")]
public sealed class AdminTicketPromoCodesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid matchId, CancellationToken ct)
    {
        var rows = await db.TicketPromoCodes.AsNoTracking().Where(x => x.MatchId == matchId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.MatchId, x.Code, x.ExpiresAt, x.MaxUses, x.Uses, x.IsEnabled, x.CreatedAt })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(TicketPromoRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == request.MatchId, ct)) return NotFound(new { message = "Partita non trovata." });
        var code = Normalize(request.Code);
        if (code.Length is < 3 or > 40 || code.Any(ch => !char.IsAsciiLetterOrDigit(ch) && ch != '-' && ch != '_'))
            return BadRequest(new { message = "Il codice deve contenere 3-40 caratteri: lettere, numeri, trattino o underscore." });
        if (request.MaxUses is <= 0 || (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTimeOffset.UtcNow))
            return BadRequest(new { message = "Controlla il limite utilizzi e la scadenza." });
        if (await db.TicketPromoCodes.AnyAsync(x => x.MatchId == request.MatchId && x.Code == code, ct))
            return Conflict(new { message = "Questo codice esiste già per la partita." });

        var promo = new TicketPromoCode { MatchId = request.MatchId, Code = code, ExpiresAt = request.ExpiresAt, MaxUses = request.MaxUses, IsEnabled = request.IsEnabled };
        db.TicketPromoCodes.Add(promo);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "TicketPromoCode", promo.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), new { promo.MatchId, promo.Code }, ct);
        return Ok(new { promo.Id, promo.MatchId, promo.Code, promo.ExpiresAt, promo.MaxUses, promo.Uses, promo.IsEnabled, promo.CreatedAt });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, TicketPromoUpdateRequest request, CancellationToken ct)
    {
        var promo = await db.TicketPromoCodes.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (promo is null) return NotFound();
        if (request.MaxUses is <= 0 || (request.ExpiresAt.HasValue && request.ExpiresAt.Value <= DateTimeOffset.UtcNow) || (request.MaxUses.HasValue && request.MaxUses < promo.Uses))
            return BadRequest(new { message = "Controlla il limite utilizzi e la scadenza." });
        promo.ExpiresAt = request.ExpiresAt;
        promo.MaxUses = request.MaxUses;
        promo.IsEnabled = request.IsEnabled;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var promo = await db.TicketPromoCodes.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (promo is null) return NotFound();
        db.TicketPromoCodes.Remove(promo);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static string Normalize(string? value) => (value ?? string.Empty).Trim().ToUpperInvariant();
}

public sealed record TicketPromoRequest(Guid MatchId, string? Code, DateTimeOffset? ExpiresAt, int? MaxUses, bool IsEnabled = true);
public sealed record TicketPromoUpdateRequest(DateTimeOffset? ExpiresAt, int? MaxUses, bool IsEnabled);
