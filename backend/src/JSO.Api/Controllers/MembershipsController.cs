using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public + fan supporter memberships (idea B: monetisation).
// Anyone can browse the active plans. A signed-in fan subscribes (creating a
// Pending membership whose price is recomputed server-side from the active
// plan) and then pays it online via the shared Flouci/Stripe abstraction. The
// membership only becomes Active once the payment is confirmed server-side by
// the verified provider webhook (never by the browser redirect).
[ApiController]
[Route("api/memberships")]
public sealed class MembershipsController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks) : ControllerBase
{
    // Public catalogue: active plans only, ordered for display.
    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var plans = await db.MembershipPlans.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.Price)
            .Select(x => new { x.Id, x.Name, x.Description, x.Price, x.Currency, x.DurationDays })
            .ToListAsync(ct);
        return Ok(plans);
    }

    // Fan: subscribe to an active plan. Creates a Pending membership with the
    // price/currency SNAPSHOTTED server-side from the active plan (never trusted
    // from the client). Returns the id so the fan can immediately pay it.
    [HttpPost]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Subscribe(MembershipSubscribeRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var plan = await db.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.PlanId && x.IsActive, ct);
        if (plan is null) return BadRequest(new { message = "Cet abonnement n'est pas disponible." });
        if (plan.Price <= 0) return BadRequest(new { message = "Le prix de l'abonnement est invalide." });

        var membership = new Membership
        {
            FanUserId = fanId.Value,
            MembershipPlanId = plan.Id,
            Status = "Pending",
            PaymentStatus = "Pending",
            // Price/currency snapshotted from the active plan, server-side.
            Price = plan.Price,
            Currency = plan.Currency,
        };
        db.Memberships.Add(membership);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Membership", membership.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { membership.MembershipPlanId, membership.Price }, ct);

        return Created($"/api/memberships/{membership.Id}",
            new { membership.Id, membership.MembershipPlanId, membership.Price, membership.Currency, membership.Status, membership.PaymentStatus });
    }

    // Fan: list my memberships (newest first).
    [HttpGet("mine")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var rows = await db.Memberships.AsNoTracking()
            .Where(x => x.FanUserId == fanId)
            .OrderByDescending(x => x.CreatedAt)
            .Join(db.MembershipPlans.AsNoTracking(), m => m.MembershipPlanId, p => p.Id, (m, p) => new
            {
                m.Id, m.MembershipPlanId, PlanName = p.Name, m.Price, m.Currency,
                m.Status, m.PaymentStatus, m.StartsAt, m.EndsAt, m.CreatedAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    // Fan: single membership lookup for the owning fan. Used by the payment
    // return page to poll the status (set server-side by the webhook).
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyMembership(Guid id, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var row = await db.Memberships.AsNoTracking()
            .Where(x => x.Id == id && x.FanUserId == fanId)
            .Select(x => new { x.Id, x.MembershipPlanId, x.Price, x.Currency, x.Status, x.PaymentStatus, x.StartsAt, x.EndsAt, x.CreatedAt })
            .SingleOrDefaultAsync(ct);
        if (row is null) return NotFound();
        return Ok(row);
    }

    // Fan: start an online payment for the fan's OWN Pending membership. Same
    // model as the shop/tickets/wall: country routing (Tunisia -> Flouci/TND,
    // otherwise Stripe), HOSTED page (no card data on our servers), persisted
    // provider/country/ProviderRef, redirect URL returned. Confirmation is
    // server-side only via the verified webhook (Pending -> Active). Missing
    // provider config degrades to a clean 503.
    [HttpPost("{id:guid}/pay")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Pay(Guid id, MembershipPayRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        var membership = await db.Memberships.SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (membership is null) return NotFound();
        if (membership.PaymentStatus == "Paid")
            return BadRequest(new { message = "Cet abonnement a déjà été réglé." });
        if (membership.Price <= 0)
            return BadRequest(new { message = "Le montant de l'abonnement doit être supérieur à zéro." });

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
        var returnUrl = $"{baseUrl}/payment/success?payableType=Membership&payableId={membership.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?payableType=Membership&payableId={membership.Id}";

        var paymentRequest = new PaymentRequest(
            PayableTypes.Membership, membership.Id, fanId.Value, membership.Price,
            "Abonnement JSO");

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

        membership.PaymentProvider = provider.Name;
        membership.Country = country;
        membership.ProviderRef = initiation.ProviderRef;
        membership.ChargedAmount = initiation.ChargedAmount;
        membership.ChargedCurrency = initiation.ChargedCurrency;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("MEMBERSHIP_PAY_INIT", "Membership", membership.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, membership.Country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name });
    }

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public sealed record MembershipSubscribeRequest(Guid PlanId);

public sealed record MembershipPayRequest(string Country);
