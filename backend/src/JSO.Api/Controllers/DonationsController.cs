using System.Text.Json;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/donations")]
public sealed class DonationsController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks) : ControllerBase
{
    private const string CampaignStatus = "Donation";

    [HttpGet("payment-methods")]
    public IActionResult PaymentMethods()
    {
        try
        {
            paymentLinks.ResolvePublicBaseUrl(Request);
            return Ok(new
            {
                flouci = paymentSelector.Flouci.IsConfigured,
                stripe = paymentSelector.Stripe.IsConfigured
            });
        }
        catch (InvalidOperationException)
        {
            return Ok(new { flouci = false, stripe = false });
        }
    }

    [HttpGet("campaign")]
    public async Task<IActionResult> Campaign(CancellationToken ct)
    {
        var settings = await DonationCampaignSettings.LoadAsync(db, ct);
        var paid = db.SupporterBricks.AsNoTracking()
            .Where(x => x.Status == CampaignStatus && x.PaymentStatus == "Paid");
        var monthStart = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);

        var total = await paid.SumAsync(x => x.Amount, ct);
        var monthlyTotal = await paid.Where(x => x.PaidAt >= monthStart && x.PaidAt < monthEnd)
            .SumAsync(x => x.Amount, ct);
        var count = await paid.CountAsync(ct);
        var recent = await paid
            .OrderByDescending(x => x.PaidAt)
            .Take(9)
            .Select(x => new
            {
                x.Id,
                DisplayName = x.PaymentProvider == "Cash" ? "Donateur en espèces" : x.DisplayName,
                Message = x.PaymentProvider == "Cash" ? null : x.Message,
                x.Amount, x.PaidAt
            })
            .ToListAsync(ct);

        return Ok(new
        {
            campaignKey = "jso-support-2026",
            title = "Soutien JSO 2026/2027",
            description = "Aidez la Jeunesse Sportive de Oudhref à poursuivre son projet sportif et associatif.",
            targetDonors = settings.TargetDonors,
            suggestedMonthlyContributionTnd = settings.SuggestedMonthlyContributionTnd,
            monthlyGoalTnd = settings.MonthlyGoalTnd,
            annualGoalTnd = settings.AnnualGoalTnd,
            goalTnd = settings.MonthlyGoalTnd,
            totalPaidTnd = total,
            monthlyPaidTnd = monthlyTotal,
            donorCount = count,
            recentDonations = recent,
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDonationRequest request, CancellationToken ct)
    {
        var error = Validate(request.DisplayName, request.Message, request.Amount);
        if (error is not null) return BadRequest(new { message = error });

        var donation = new SupporterBrick
        {
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName)
                ? "Un amoureux de la JSO"
                : request.DisplayName.Trim(),
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Amount = request.Amount,
            DonorPhone = NormalizePhone(request.Phone),
            WhatsAppOptIn = request.WhatsAppOptIn,
            Status = CampaignStatus,
            PaymentStatus = "Pending",
        };

        db.SupporterBricks.Add(donation);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("DONATION_CREATED", "SupporterBrick", donation.Id.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { donation.Amount, hasPhone = !string.IsNullOrWhiteSpace(donation.DonorPhone), whatsappOptIn = donation.WhatsAppOptIn, campaign = "jso-support-2026" }, ct);

        return Created($"/api/donations/{donation.Id}", new
        {
            id = donation.Id,
            donation.DisplayName,
            donation.Amount,
            paymentStatus = donation.PaymentStatus,
        });
    }

    [HttpGet("{id:guid}/receipt")]
    public async Task<IActionResult> Receipt(Guid id, CancellationToken ct)
    {
        var donation = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.Id == id && x.Status == CampaignStatus && x.PaymentStatus == "Paid")
            .Select(x => new { x.Id, x.DisplayName, x.Message, x.Amount, x.PaidAt, x.ProviderRef, x.PaymentProvider, x.Country, x.CashPointType, x.CashPointName })
            .SingleOrDefaultAsync(ct);

        if (donation is null) return NotFound();

        return Ok(new
        {
            id = donation.Id,
            receiptNumber = donation.PaymentProvider == "Cash" && !string.IsNullOrWhiteSpace(donation.ProviderRef)
                ? donation.ProviderRef
                : $"JSO-DON-{donation.PaidAt:yyyyMMdd}-{donation.Id.ToString("N")[..8].ToUpperInvariant()}",
            donorName = donation.DisplayName,
            message = donation.PaymentProvider == "Cash" ? null : donation.Message,
            amount = donation.Amount,
            currency = "TND",
            paidAt = donation.PaidAt,
            pointType = donation.CashPointType,
            pointName = donation.CashPointName,
            campaign = "jso-support-2026",
            verificationUrl = $"/api/donations/{donation.Id}/receipt"
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Status(Guid id, CancellationToken ct)
    {
        var donation = await db.SupporterBricks.AsNoTracking()
            .Where(x => x.Id == id && x.Status == CampaignStatus)
            .Select(x => new { x.Id, x.Amount, x.PaymentStatus, x.PaidAt })
            .SingleOrDefaultAsync(ct);
        return donation is null ? NotFound() : Ok(donation);
    }

    [HttpPost("{id:guid}/pay")]
    public async Task<IActionResult> Pay(Guid id, PayDonationRequest request, CancellationToken ct)
    {
        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        var donation = await db.SupporterBricks.SingleOrDefaultAsync(
            x => x.Id == id && x.Status == CampaignStatus, ct);
        if (donation is null) return NotFound();
        if (donation.PaymentStatus == "Paid")
            return BadRequest(new { message = "Cette contribution a déjà été réglée." });
        if (donation.Amount <= 0)
            return BadRequest(new { message = "Le montant de la contribution doit être supérieur à zéro." });

        var provider = paymentSelector.Select(country);
        if (!provider.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible." });

        string baseUrl;
        try { baseUrl = paymentLinks.ResolvePublicBaseUrl(Request); }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Le paiement en ligne n'est pas correctement configuré." });
        }

        var returnUrl = $"{baseUrl}/payment/success?payableType=Donation&payableId={donation.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?payableType=Donation&payableId={donation.Id}";
        var paymentRequest = new PaymentRequest(
            PayableTypes.Donation, donation.Id, null, donation.Amount, "Soutien JSO 2026/2027");

        PaymentInitiation initiation;
        try { initiation = await provider.InitiatePaymentAsync(paymentRequest, returnUrl, cancelUrl, ct); }
        catch (PaymentProviderNotConfiguredException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible." });
        }
        catch (PaymentProviderException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
        }

        donation.PaymentProvider = provider.Name;
        donation.Country = country;
        donation.ProviderRef = initiation.ProviderRef;
        donation.ChargedAmount = initiation.ChargedAmount;
        donation.ChargedCurrency = initiation.ChargedCurrency;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("DONATION_PAYMENT_INIT", "SupporterBrick", donation.Id.ToString(), null, null,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name });
    }

    private static string? Validate(string? displayName, string? message, decimal amount)
    {
        if (amount < 1m) return "Le montant minimum du don est de 1 TND.";
        if (amount > 1_000_000m) return "Le montant du don est hors limites.";
        if (displayName?.Trim().Length > 80) return "Le nom affiché doit contenir au maximum 80 caractères.";
        if (message?.Trim().Length > 280) return "Le message doit contenir au maximum 280 caractères.";
        return null;
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var value = phone.Trim();
        return value.Length <= 32 ? value : value[..32];
    }
}

public sealed record CreateDonationRequest(
    string? DisplayName,
    string? Message,
    decimal Amount,
    string? Phone,
    bool WhatsAppOptIn);
public sealed record PayDonationRequest(string Country);
