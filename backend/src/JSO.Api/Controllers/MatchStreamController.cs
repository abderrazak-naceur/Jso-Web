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
// Entitlements are evaluated server-side. Developer/admin preview access is
// deliberately separate from payment state: it never creates or marks a
// MatchStreamAccess as Paid and therefore cannot affect revenue reporting.
[ApiController]
[Route("api/matches/{matchId:guid}/stream")]
public sealed class MatchStreamController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks) : ControllerBase
{
    // Public metadata for a published stream. The playback URL is only returned
    // to free-stream viewers, fans with a server-confirmed Paid access, or
    // authenticated trusted staff with an explicit preview role.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid matchId, CancellationToken ct)
    {
        var stream = await db.MatchStreams.AsNoTracking()
            .SingleOrDefaultAsync(x => x.MatchId == matchId && x.IsPublished, ct);
        if (stream is null) return NotFound();

        var previewAccess = HasPreviewRole();
        var fanId = CurrentFanId();
        var hasPaidAccess = fanId is not null && await db.MatchStreamAccesses.AsNoTracking()
            .AnyAsync(a => a.MatchStreamId == stream.Id && a.FanUserId == fanId && (a.Status == "Paid" || a.Status == "Promo"), ct);

        var entitled = !stream.IsPaid || hasPaidAccess || previewAccess;

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
            isPreviewAccess = previewAccess && stream.IsPaid && !hasPaidAccess,
            streamUrl = entitled ? stream.StreamUrl : null,
        });
    }

    // Fan: create OR reuse a Pending access and start online payment. Preview
    // users do not need to call this endpoint; the metadata endpoint grants
    // playback without creating a payment record.
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

        // Promo codes are validated by the server; clients never submit a price.
        // A full discount grants a Promo entitlement, not a fake paid transaction.
        var promoInput = NormalizePromo(request.PromoCode);
        MatchStreamPromoCode? promo = null;
        decimal payableAmount = stream.Price;
        if (promoInput.Length > 0)
        {
            promo = await db.MatchStreamPromoCodes.SingleOrDefaultAsync(
                x => x.MatchStreamId == stream.Id && x.Code == promoInput, ct);
            if (promo is null || !promo.IsEnabled ||
                (promo.ExpiresAt.HasValue && promo.ExpiresAt.Value <= DateTimeOffset.UtcNow) ||
                (promo.MaxUses.HasValue && promo.Uses >= promo.MaxUses.Value))
                return BadRequest(new { message = "Codice promo non valido, scaduto o esaurito." });
            payableAmount = decimal.Round(stream.Price * (100 - promo.DiscountPercent) / 100m, 2, MidpointRounding.AwayFromZero);
        }

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

        if (promo is not null && payableAmount == 0m)
        {
            promo.Uses++;
            access.Status = "Promo";
            access.PaymentProvider = null;
            access.ProviderRef = null;
            access.Country = country;
            access.ChargedAmount = 0m;
            access.ChargedCurrency = stream.Currency;
            await db.SaveChangesAsync(ct);
            await audit.LogAsync("MATCH_STREAM_ACCESS_PROMO_REDEEMED", "MatchStreamAccess", access.Id.ToString(), fanId.Value.ToString(),
                User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
                new { promo.Code, promo.DiscountPercent, stream.MatchId }, ct);
            return Ok(new { accessId = access.Id, status = access.Status, granted = true, redirectUrl = (string?)null });
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
            PayableTypes.MatchStreamAccess, access.Id, fanId.Value, payableAmount,
            promo is null ? "Accès direct JSO" : $"Accès direct JSO — promo {promo.Code} ({promo.DiscountPercent}%)");

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

        if (promo is not null) promo.Uses++;
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

    private static string NormalizePromo(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

    private bool HasPreviewRole() =>
        User.Identity?.IsAuthenticated == true &&
        (User.IsInRole("Developer") || User.IsInRole("Admin") || User.IsInRole("SuperAdmin"));

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public sealed record MatchStreamAccessRequest(string Country, string? PromoCode = null);
