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
    Microsoft.Extensions.Configuration.IConfiguration configuration) : ControllerBase
{
    [HttpGet("match/{matchId:guid}")]
    public async Task<IActionResult> GetForMatch(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AsNoTracking().AnyAsync(x => x.Id == matchId && x.IsPublished, ct))
            return NotFound();

        var types = await db.TicketTypes.AsNoTracking()
            .Where(x => x.MatchId == matchId && x.IsActive)
            .OrderBy(x => x.Price)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Price,
                x.Currency,
                available = x.Capacity - x.SoldCount
            })
            .ToListAsync(ct);

        return Ok(types);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyTickets(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var orders = await db.TicketOrders.AsNoTracking()
            .Where(x => x.FanUserId == fanId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status, x.CreatedAt, x.ConfirmedAt })
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
        var order = await db.TicketOrders.AsNoTracking()
            .Where(x => x.Id == id && x.FanUserId == fanId)
            .Select(x => new { x.Id, x.MatchId, x.TicketTypeName, x.Quantity, x.Total, x.Currency, x.Status, x.CreatedAt, x.ConfirmedAt })
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

        var type = await db.TicketTypes.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.TicketTypeId && x.IsActive, ct);
        if (type is null) return BadRequest(new { message = "Ticket type not available." });
        if (type.Capacity - type.SoldCount < request.Quantity)
            return BadRequest(new { message = "Not enough tickets available." });

        var order = new TicketOrder
        {
            FanUserId = fanId.Value,
            MatchId = type.MatchId,
            TicketTypeId = type.Id,
            TicketTypeName = type.Name,
            UnitPrice = type.Price,
            Currency = type.Currency,
            Quantity = request.Quantity,
            Total = type.Price * request.Quantity,
            Status = "Pending"
        };
        db.TicketOrders.Add(order);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "TicketOrder", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { order.MatchId, order.Total }, ct);

        return Created($"/api/tickets/mine", new { order.Id, order.TicketTypeName, order.Quantity, order.Total, order.Currency, order.Status });
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
        if (order.Status != "Pending")
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
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible. Veuillez réessayer plus tard." });
        }
        catch (PaymentProviderException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
        }

        order.PaymentProvider = provider.Name;
        order.Country = country;
        order.ProviderRef = initiation.ProviderRef;
        order.Currency = isTunisia ? "TND" : (configuration["Payments:Stripe:Currency"] ?? "eur").ToUpperInvariant();
        order.ChargedAmount = initiation.ChargedAmount;
        order.ChargedCurrency = initiation.ChargedCurrency;
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
}

public sealed record TicketReserveRequest(Guid TicketTypeId, int Quantity);

public sealed record PayTicketRequest(string Country);
