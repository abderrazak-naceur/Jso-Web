using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Public, read-only supporters' wall (idea B7).
// Returns ONLY moderated (Approved) bricks, newest first, with an optional
// name search via querystring. The shape is stable and consumable by both the
// web and Flutter clients. No PII is exposed beyond the freely chosen
// DisplayName and Message; email, FanUserId, moderation status and internal
// timestamps are never surfaced here.
[ApiController]
[Route("api/supporters")]
public sealed class SupportersController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks) : ControllerBase
{
    [HttpGet("wall")]
    public async Task<IActionResult> GetWall([FromQuery] string? name, CancellationToken ct)
    {
        var query = db.SupporterBricks.AsNoTracking().Where(x => x.Status == "Approved");

        if (!string.IsNullOrWhiteSpace(name))
        {
            var n = name.Trim();
            query = query.Where(x => EF.Functions.ILike(x.DisplayName, "%" + n + "%"));
        }

        var bricks = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                x.Id,
                x.DisplayName,
                x.Message,
                x.Amount,
                x.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(bricks);
    }

    // Public proposal endpoint: a supporter can propose a brick which is created
    // in the "Pending" state and stays invisible until a CommunityManager
    // approves it. No payment is processed here (see TODO in SupporterBrick):
    // Amount is a declared figure and PaidAt stays null until a certified
    // provider confirms the payment.
    [HttpPost("wall")]
    public async Task<IActionResult> ProposeBrick(SupporterBrickProposal request, CancellationToken ct)
    {
        var error = Validate(request.DisplayName, request.Message, request.Amount);
        if (error is not null) return BadRequest(new { message = error });

        var brick = new SupporterBrick
        {
            DisplayName = request.DisplayName.Trim(),
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Amount = request.Amount,
            // Moderation mandatory before publication.
            Status = "Pending",
            // TODO payments: PaidAt stays null until a certified payment
            // provider confirms the transaction (out of scope this iteration).
            PaidAt = null
        };
        db.SupporterBricks.Add(brick);
        await db.SaveChangesAsync(ct);

        // Deliberately return only a minimal acknowledgement, never the internal
        // status or identifiers that could leak the moderation pipeline.
        return Accepted(new { message = "Proposition reçue. Elle sera visible après modération." });
    }

    // Fan-authenticated proposal: creates a brick tied to the signed-in fan's
    // identity and RETURNS its id so the fan can pay it online. Unlike the
    // anonymous /wall endpoint, this needs the id back to drive the payment flow.
    // The brick still starts in moderation Status="Pending" (invisible until a
    // CommunityManager approves it) and PaymentStatus="Pending"; payment and
    // moderation stay orthogonal.
    [HttpPost("mine")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> ProposeMine(SupporterBrickProposal request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var error = Validate(request.DisplayName, request.Message, request.Amount);
        if (error is not null) return BadRequest(new { message = error });

        var brick = new SupporterBrick
        {
            FanUserId = fanId.Value,
            DisplayName = request.DisplayName.Trim(),
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Amount = request.Amount,
            // Moderation mandatory before publication; payment tracked separately.
            Status = "Pending",
            PaymentStatus = "Pending"
        };
        db.SupporterBricks.Add(brick);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "SupporterBrick", brick.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { brick.DisplayName, brick.Amount }, ct);

        // Return the id + payment status so the fan can immediately pay it. We do
        // NOT expose the moderation Status to avoid leaking the pipeline.
        return Created($"/api/supporters/mine/{brick.Id}",
            new { brick.Id, brick.DisplayName, brick.Amount, brick.PaymentStatus });
    }

    // Fan-authenticated status lookup for the fan's own brick. Used by the
    // payment return page to poll the payment status (set server-side by the
    // verified webhook). Exposes PaymentStatus, never the moderation Status.
    [HttpGet("mine/{id:guid}")]
    [Authorize(Roles = "Fan")]
    public async Task<IActionResult> MyBrick(Guid id, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();
        var brick = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.Id == id && x.FanUserId == fanId)
            .Select(x => new { x.Id, x.DisplayName, x.Amount, x.PaymentStatus, x.PaidAt })
            .SingleOrDefaultAsync(ct);
        if (brick is null) return NotFound();
        return Ok(brick);
    }

    // Starts an online payment for the fan's OWN brick. Only the fan who created
    // the brick (FanUserId match) may pay it. Same model as the shop/tickets:
    // country routing (Tunisia -> Flouci/TND, otherwise Stripe), HOSTED page (no
    // card data on our servers), persisted provider/country/ProviderRef, redirect
    // URL returned. Confirmation is server-side only via the verified webhook,
    // which sets PaymentStatus="Paid" WITHOUT touching moderation. Missing
    // provider config degrades to a clean 503.
    [HttpPost("{id:guid}/pay")]
    [Authorize(Roles = "Fan")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Pay(Guid id, PaySupporterRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        var brick = await db.SupporterBricks.SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (brick is null) return NotFound();
        if (brick.PaymentStatus == "Paid")
            return BadRequest(new { message = "Cette contribution a déjà été réglée." });
        if (brick.Amount <= 0)
            return BadRequest(new { message = "Le montant de la contribution doit être supérieur à zéro." });

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
        var returnUrl = $"{baseUrl}/payment/success?payableType=SupporterBrick&payableId={brick.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?payableType=SupporterBrick&payableId={brick.Id}";

        var paymentRequest = new PaymentRequest(
            PayableTypes.SupporterBrick, brick.Id, fanId.Value, brick.Amount,
            $"Mur des supporters JSO - {brick.DisplayName}");

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

        brick.PaymentProvider = provider.Name;
        brick.Country = country;
        brick.ProviderRef = initiation.ProviderRef;
        brick.ChargedAmount = initiation.ChargedAmount;
        brick.ChargedCurrency = initiation.ChargedCurrency;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("SUPPORTER_PAY_INIT", "SupporterBrick", brick.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, brick.Country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name });
    }

    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    internal static string? Validate(string? displayName, string? message, decimal amount)
    {
        if (string.IsNullOrWhiteSpace(displayName)) return "Display name is required.";
        if (displayName.Trim().Length > 80) return "Display name must be 80 characters or fewer.";
        if (message is not null && message.Trim().Length > 280) return "Message must be 280 characters or fewer.";
        if (amount < 0) return "Amount cannot be negative.";
        if (amount > 1_000_000_000m) return "Amount is out of range.";
        return null;
    }
}

public sealed record SupporterBrickProposal(string DisplayName, string? Message, decimal Amount);

public sealed record PaySupporterRequest(string Country);
