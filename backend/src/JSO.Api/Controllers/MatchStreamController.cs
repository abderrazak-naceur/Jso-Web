using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public + fan pay-per-view live stream access for a match (idea B24).
//
// SECURITY (the core of this feature): the sensitive MatchStream.StreamUrl is
// NEVER returned to a viewer who is not entitled. Entitlement is derived
// SERVER-SIDE:
//   - the stream is free (IsPaid == false), OR
//   - the current fan (from the JWT) holds a Paid MatchStreamAccess.
// The metadata endpoint is anonymous and only ever exposes title/price/window/
// isPaid; the streamUrl field is populated only for an entitled request. A fan
// creates/reuses a Pending access and pays it online; the access becomes Paid
// only via the verified provider webhook (never the browser redirect).
[ApiController]
[Route("api/matches/{matchId:guid}/stream")]
public sealed class MatchStreamController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks) : ControllerBase
{
    // Public metadata for a match's published stream. Anonymous. The StreamUrl
    // is revealed ONLY when the viewer is entitled (free stream, or the signed-in
    // fan has a Paid access); otherwise it is null and hasAccess is false.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid matchId, CancellationToken ct)
    {
        var stream = await db.MatchStreams.AsNoTracking()
            .SingleOrDefaultAsync(x => x.MatchId == matchId && x.IsPublished, ct);
        if (stream is null) return NotFound();

        var fanId = CurrentFanId();
        var hasPaidAccess = fanId is not null && await db.MatchStreamAccesses.AsNoTracking()
            .AnyAsync(a => a.MatchStreamId == stream.Id && a.FanUserId == fanId && a.Status == "Paid", ct);

        // Entitled = free stream OR the current fan paid. Only then do we reveal
        // the playback link. This is the single server-side gate.
        var entitled = !stream.IsPaid || hasPaidAccess;

        return Ok(new
        {
            stream.Id,
            stream.Provider,
            stream.IsPaid,
            stream.Price,
            stream.Currency,
            stream.StartsAt,
            stream.EndsAt,
            hasAccess = entitled,
            streamUrl = entitled ? stream.StreamUrl : null,
        });
    }

    // Fan: create OR reuse a Pending access for this stream and start an online
    // payment. Free streams need no access (they are already viewable). Same
    // model as the other payables: country routing, HOSTED page, redirect URL.
    // A fan holds at most one access per stream (unique constraint), so we reuse
    // an existing Pending row instead of creating duplicates. Already-paid access
    // short-circuits with a clear message.
    [HttpPost("access")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> StartAccess(Guid matchId, MatchStreamAccessRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        var stream = await db.MatchStreams.SingleOrDefaultAsync(x => x.MatchId == matchId && x.IsPublished, ct);
        if (stream is null) return NotFound();
        if (!stream.IsPaid)
            return BadRequest(new { message = "Cette diffusion est gratuite, aucun paiement n'est nécessaire." });
        if (stream.Price <= 0)
            return BadRequest(new { message = "Le montant de l'accès doit être supérieur à zéro." });

        // Reuse an existing access (unique per fan+stream). Already paid -> stop.
        var access = await db.MatchStreamAccesses
            .SingleOrDefaultAsync(x => x.MatchStreamId == stream.Id && x.FanUserId == fanId, ct);
        if (access is { Status: "Paid" })
            return BadRequest(new { message = "Vous avez déjà accès à cette diffusion." });
        if (access is null)
        {
            access = new MatchStreamAccess
            {
                FanUserId = fanId.Value,
                MatchStreamId = stream.Id,
                Status = "Pending",
            };
            db.MatchStreamAccesses.Add(access);
            await db.SaveChangesAsync(ct);
        }

        var provider = paymentSelector.Select(country);
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
        var returnUrl = $"{baseUrl}/payment/success?payableType=MatchStreamAccess&payableId={access.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?payableType=MatchStreamAccess&payableId={access.Id}";

        var paymentRequest = new PaymentRequest(
            PayableTypes.MatchStreamAccess, access.Id, fanId.Value, stream.Price,
            "Accès direct JSO");

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

        access.PaymentProvider = provider.Name;
        access.Country = country;
        access.ProviderRef = initiation.ProviderRef;
        access.ChargedAmount = initiation.ChargedAmount;
        access.ChargedCurrency = initiation.ChargedCurrency;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("MATCH_STREAM_ACCESS_PAY_INIT", "MatchStreamAccess", access.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, access.Country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name, accessId = access.Id });
    }

    // Fan: poll the fan's own access status for this stream. Used by the payment
    // return page. Never reveals the StreamUrl (that stays on the metadata GET,
    // gated the same way).
    [HttpGet("access")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyAccess(Guid matchId, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var row = await db.MatchStreamAccesses.AsNoTracking()
            .Where(x => x.FanUserId == fanId)
            .Join(db.MatchStreams.AsNoTracking().Where(s => s.MatchId == matchId),
                a => a.MatchStreamId, s => s.Id, (a, s) => new { a.Id, a.Status, a.PaidAt })
            .SingleOrDefaultAsync(ct);
        if (row is null) return NotFound();
        return Ok(row);
    }

    // Fan: poll a specific access row by its own id. Used by the generic payment
    // return page (which polls by payableType + payableId). Only the owning fan
    // may read it; never reveals the StreamUrl.
    [HttpGet("/api/matches/stream-access/{accessId:guid}")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyAccessById(Guid accessId, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var row = await db.MatchStreamAccesses.AsNoTracking()
            .Where(x => x.Id == accessId && x.FanUserId == fanId)
            .Select(x => new { x.Id, x.MatchStreamId, x.Status, x.PaidAt })
            .SingleOrDefaultAsync(ct);
        if (row is null) return NotFound();
        return Ok(row);
    }

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public sealed record MatchStreamAccessRequest(string Country);
