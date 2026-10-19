using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public + fan ticketing. Anyone can see available ticket types for a published
// match (with remaining availability). A signed-in fan can reserve tickets; the
// price is recomputed server-side and the reservation starts Pending until an
// admin confirms it (manual gateway).
[ApiController]
[Route("api/tickets")]
public sealed class TicketsController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks,
    Microsoft.Extensions.Configuration.IConfiguration configuration,
    ContentTranslationService translations,
    InventoryReservationService reservations) : ControllerBase
{
    // Public billetterie listing: published matches that have at least one
    // active ticket type, with the cheapest price and total remaining places.
    // Powers the public "Billetterie" page so fans see every match on sale.
    [HttpGet("matches")]
    public async Task<IActionResult> GetMatchesOnSale(CancellationToken ct)
    {
        var activeTypes = db.TicketTypes.AsNoTracking().Where(x => x.IsActive);
        var matches = await db.Matches.AsNoTracking()
            .Where(x => x.IsPublished && activeTypes.Any(t => t.MatchId == x.Id))
            .OrderBy(x => x.KickoffAt)
            .Select(x => new
            {
                x.Id,
                x.OpponentName,
                x.KickoffAt,
                x.Venue,
                x.IsHome,
                x.Status,
                fromPrice = activeTypes.Where(t => t.MatchId == x.Id).Min(t => (decimal?)t.Price),
                currency = activeTypes.Where(t => t.MatchId == x.Id).Select(t => t.Currency).FirstOrDefault(),
                available = activeTypes.Where(t => t.MatchId == x.Id).Sum(t => (int?)(t.Capacity - t.SoldCount - t.ReservedCount)) ?? 0
            })
            .ToListAsync(ct);

        return Ok(matches);
    }

    [HttpGet("match/{matchId:guid}")]
    public async Task<IActionResult> GetForMatch(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == matchId && x.IsPublished, ct))
            return NotFound();

        var entities = await db.TicketTypes.AsNoTracking()
            .Where(x => x.MatchId == matchId && x.IsActive)
            .OrderBy(x => x.Price)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("TicketType", entities.Select(x => x.Id), ["name"], language, ct);
        var types = entities.Select(x => new
        {
            x.Id,
            Name = ContentTranslationService.ResolveFromMap(map, "TicketType", x.Id, "name", x.Name, language),
            x.Price,
            x.Currency,
            available = x.Capacity - x.SoldCount - x.ReservedCount
        }).ToList();

        return Ok(types);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyTickets(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var orders = await (
            from x in db.TicketOrders.AsNoTracking()
            join match in db.Matches.AsNoTracking() on x.MatchId equals match.Id into matchGroup
            from match in matchGroup.DefaultIfEmpty()
            where x.FanUserId == fanId
            orderby x.CreatedAt descending
            select new
            {
                x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status,
                x.PaymentProvider, x.PromoCode, x.CreatedAt, x.ConfirmedAt,
                opponentName = match == null ? null : match.OpponentName,
                kickoffAt = match == null ? (DateTimeOffset?)null : match.KickoffAt,
                venue = match == null ? null : match.Venue,
                isHome = match != null && match.IsHome,
                competitionName = match == null ? null : db.Competitions
                    .Where(competition => competition.Id == match.CompetitionId)
                    .Select(competition => competition.Name)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);
        return Ok(orders);
    }

    // Single reservation lookup for the owning fan. Used by the payment return
    // page to poll the reservation status (set server-side by the webhook).
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyTicket(Guid id, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var order = await (
            from x in db.TicketOrders.AsNoTracking()
            join match in db.Matches.AsNoTracking() on x.MatchId equals match.Id into matchGroup
            from match in matchGroup.DefaultIfEmpty()
            where x.Id == id && x.FanUserId == fanId
            select new
            {
                x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status,
                x.PaymentProvider, x.PromoCode, x.CreatedAt, x.ConfirmedAt,
                opponentName = match == null ? null : match.OpponentName,
                kickoffAt = match == null ? (DateTimeOffset?)null : match.KickoffAt,
                venue = match == null ? null : match.Venue,
                isHome = match != null && match.IsHome,
                competitionName = match == null ? null : db.Competitions
                    .Where(competition => competition.Id == match.CompetitionId)
                    .Select(competition => competition.Name)
                    .FirstOrDefault()
            })
            .SingleOrDefaultAsync(ct);
        if (order is null) return NotFound();
        return Ok(order);
    }

    // Digital ticket payload for the fan's own confirmed ticket. Returns only
    // what the QR/ticket UI needs: the opaque public token (the QR content),
    // match/type/quantity/status. Rejected for Pending/Cancelled orders so no
    // token is ever exposed before the ticket is valid. The token is not a
    // credential: it only lets the staff scanner resolve this ticket server-side.
    [HttpGet("{id:guid}/digital")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> DigitalTicket(Guid id, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var order = await db.TicketOrders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (order is null) return NotFound();
        if (order.Status is not ("Confirmed" or "CheckedIn") || string.IsNullOrEmpty(order.PublicTicketToken))
            return BadRequest(new { message = "Ce billet n'a pas encore de billet numérique." });

        return Ok(new
        {
            order.Id,
            order.MatchId,
            order.TicketTypeName,
            order.Quantity,
            order.Currency,
            order.Total,
            order.Status,
            token = order.PublicTicketToken,
            order.IssuedAt,
            order.CheckedInAt
        });
    }

    [HttpPost("reserve")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Reserve(TicketReserveRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        if (request.Quantity < 1 || request.Quantity > 10)
            return BadRequest(new { message = "Quantity must be between 1 and 10." });

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await reservations.ReleaseExpiredAsync(ct);
        var type = await db.TicketTypes.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.TicketTypeId && x.IsActive, ct);
        if (type is null) return BadRequest(new { message = "Ticket type not available." });
        if (type.Capacity - type.SoldCount - type.ReservedCount < request.Quantity)
            return BadRequest(new { message = "Not enough tickets available." });

        var promoInput = NormalizePromo(request.PromoCode);
        TicketPromoCode? promo = null;
        if (promoInput.Length > 0)
        {
            promo = await db.TicketPromoCodes.SingleOrDefaultAsync(x => x.MatchId == type.MatchId && x.Code == promoInput, ct);
            if (promo is null || !promo.IsEnabled || (promo.ExpiresAt.HasValue && promo.ExpiresAt.Value <= DateTimeOffset.UtcNow) || (promo.MaxUses.HasValue && promo.Uses >= promo.MaxUses.Value))
                return BadRequest(new { message = "Code promo non valide, expiré ou épuisé." });
        }

        var now = DateTimeOffset.UtcNow;
        var order = new TicketOrder
        {
            FanUserId = fanId.Value,
            MatchId = type.MatchId,
            TicketTypeId = type.Id,
            TicketTypeName = type.Name,
            UnitPrice = type.Price,
            Currency = type.Currency,
            Quantity = request.Quantity,
            Total = promo is null ? type.Price * request.Quantity : 0m,
            PromoCode = promo?.Code,
            Status = promo is null ? "Pending" : "Confirmed",
            ConfirmedAt = promo is null ? null : DateTimeOffset.UtcNow,
            ReservationExpiresAt = promo is null ? now.Add(InventoryReservationService.ReservationLifetime) : null,
            PaymentProvider = promo is null ? null : "Promo"
        };
        if (promo is not null)
        {
            var capacityUpdated = await db.TicketTypes.Where(x => x.Id == type.Id && x.IsActive
                    && x.Capacity - x.SoldCount - x.ReservedCount >= request.Quantity)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.SoldCount, x => x.SoldCount + request.Quantity), ct);
            if (capacityUpdated != 1)
                return BadRequest(new { message = "Not enough tickets available." });
            var promoUpdated = await db.TicketPromoCodes.Where(x => x.Id == promo.Id && x.IsEnabled
                    && (!x.ExpiresAt.HasValue || x.ExpiresAt > now)
                    && (!x.MaxUses.HasValue || x.Uses < x.MaxUses.Value))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Uses, x => x.Uses + 1), ct);
            if (promoUpdated != 1) return BadRequest(new { message = "Code promo épuisé." });
            order.PublicTicketToken = TicketTokenGenerator.Generate();
            order.IssuedAt = DateTimeOffset.UtcNow;
        }
        else if (await reservations.TryReserveTicketAsync(type.Id, request.Quantity, ct) != 1)
        {
            return BadRequest(new { message = "Not enough tickets available." });
        }
        db.TicketOrders.Add(order);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        await audit.LogAsync("CREATE", "TicketOrder", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { order.MatchId, order.Total, promoCode = order.PromoCode, order.Status }, ct);

        return Created($"/api/tickets/mine", new { order.Id, order.TicketTypeName, order.Quantity, order.Total, order.Currency, order.Status, order.PromoCode });
    }

    // Starts an online payment for one of the fan's own Pending ticket
    // reservations. Identical model to the shop /pay: the buyer picks a country
    // (Tunisia -> Flouci/TND, otherwise Stripe/international), we create a HOSTED
    // payment session (no card data touches our servers), persist the provider,
    // country and ProviderRef, and return the redirect URL. The reservation is
    // NOT confirmed here - only the verified provider webhook confirms it
    // (Pending -> Confirmed + SoldCount incremented). A missing provider config
    // degrades to a clean 503.
    [HttpPost("{id:guid}/pay")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Pay(Guid id, PayTicketRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        // Only the owning fan may pay their own reservation.
        var order = await db.TicketOrders.SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (order is null) return NotFound();
        var now = DateTimeOffset.UtcNow;
        if (order.Status != "Pending" || order.ReservationExpiresAt <= now)
            return BadRequest(new { message = "Cette réservation n'est plus en attente de paiement." });

        var provider = paymentSelector.Select(country);
        var isTunisia = PaymentProviderSelector.IsTunisia(country);

        if (!provider.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible. Veuillez réessayer plus tard." });

        string baseUrl;
        try
        {
            baseUrl = paymentLinks.ResolvePublicBaseUrl(Request);
        }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Le paiement en ligne n'est pas correctement configuré. Veuillez réessayer plus tard." });
        }

        var claimed = await db.TicketOrders.Where(x => x.Id == id && x.FanUserId == fanId
                && x.Status == "Pending" && x.ReservationExpiresAt > now)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.ReservationExpiresAt,
                    now.Add(InventoryReservationService.PaymentReservationLifetime)), ct);
        if (claimed != 1) return Conflict(new { message = "La réservation a expiré. Veuillez recommencer." });
        order.ReservationExpiresAt = now.Add(InventoryReservationService.PaymentReservationLifetime);
        var returnUrl = $"{baseUrl}/payment/success?payableType=TicketOrder&payableId={order.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?payableType=TicketOrder&payableId={order.Id}";

        var paymentRequest = new PaymentRequest(
            PayableTypes.TicketOrder, order.Id, fanId.Value, order.Total,
            $"Billet JSO {order.TicketTypeName} x{order.Quantity}");

        PaymentInitiation initiation;
        try
        {
            initiation = await provider.InitiatePaymentAsync(paymentRequest, returnUrl, cancelUrl, ct);
        }
        catch (PaymentProviderNotConfiguredException)
        {
            order.ReservationExpiresAt = DateTimeOffset.UtcNow.Add(InventoryReservationService.ReservationLifetime);
            await db.SaveChangesAsync(ct);
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible. Veuillez réessayer plus tard." });
        }
        catch (PaymentProviderException ex)
        {
            order.ReservationExpiresAt = DateTimeOffset.UtcNow.Add(InventoryReservationService.ReservationLifetime);
            await db.SaveChangesAsync(ct);
            return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // The provider may have created a session before the connection was
            // interrupted; retain the longer checkout window for late webhooks.
            throw;
        }

        order.PaymentProvider = provider.Name;
        order.Country = country;
        order.ProviderRef = initiation.ProviderRef;
        order.Currency = isTunisia ? "TND" : (configuration["Payments:Stripe:Currency"] ?? "eur").ToUpperInvariant();
        order.ChargedAmount = initiation.ChargedAmount;
        order.ChargedCurrency = initiation.ChargedCurrency;
        order.ReservationExpiresAt = DateTimeOffset.UtcNow.Add(InventoryReservationService.PaymentReservationLifetime);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("TICKET_PAY_INIT", "TicketOrder", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, order.Country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name });
    }

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private static string NormalizePromo(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();
}

public sealed record TicketReserveRequest(Guid TicketTypeId, int Quantity, string? PromoCode = null);

public sealed record PayTicketRequest(string Country);
