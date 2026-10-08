using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,FinanceManager")]
[Route("api/admin/donations")]
public sealed class AdminDonationsController(
    JsoDbContext db, AuditService audit, PaymentProviderSelector paymentSelector,
    PaymentLinkBuilder paymentLinks, IOptions<PaymentOptions> paymentOptions,
    IHostEnvironment environment) : ControllerBase
{
    [HttpGet("settings")]
    public async Task<IActionResult> Settings(CancellationToken ct)
    {
        var settings = await DonationCampaignSettings.LoadAsync(db, ct);
        var options = paymentOptions.Value;
        bool publicUrlConfigured;
        try { paymentLinks.ResolvePublicBaseUrl(Request); publicUrlConfigured = true; }
        catch (InvalidOperationException) { publicUrlConfigured = false; }

        var flouciMissing = new List<string>();
        if (string.IsNullOrWhiteSpace(options.Flouci.AppToken)) flouciMissing.Add("Payments__Flouci__AppToken");
        if (string.IsNullOrWhiteSpace(options.Flouci.AppSecret)) flouciMissing.Add("Payments__Flouci__AppSecret");
        if (environment.IsProduction() && string.IsNullOrWhiteSpace(options.Flouci.WebhookSecret))
            flouciMissing.Add("Payments__Flouci__WebhookSecret");
        var stripeMissing = new List<string>();
        if (string.IsNullOrWhiteSpace(options.Stripe.SecretKey)) stripeMissing.Add("Payments__Stripe__SecretKey");
        if (string.IsNullOrWhiteSpace(options.Stripe.WebhookSecret)) stripeMissing.Add("Payments__Stripe__WebhookSecret");
        if (!publicUrlConfigured)
        {
            flouciMissing.Add("Payments__PublicBaseUrl");
            stripeMissing.Add("Payments__PublicBaseUrl");
        }
        return Ok(new
        {
            settings,
            providers = new
            {
                flouci = new { available = paymentSelector.Flouci.IsConfigured && publicUrlConfigured, missing = flouciMissing },
                stripe = new { available = paymentSelector.Stripe.IsConfigured && publicUrlConfigured, missing = stripeMissing }
            }
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(DonationCampaignSettings settings, CancellationToken ct)
    {
        if (settings.ValidationError is { } error) return BadRequest(new { message = error });
        var email = User.FindFirst("email")?.Value;
        var row = await DonationCampaignSettings.SaveAsync(db, settings, email, ct);
        await audit.LogAsync("UPDATE", "SiteContent", row.Id.ToString(), User.FindFirst("sub")?.Value,
            email, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { key = DonationCampaignSettings.ContentKey, settings }, ct);
        return Ok(settings);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var settings = await DonationCampaignSettings.LoadAsync(db, ct);
        var donations = db.SupporterBricks.AsNoTracking()
            .Where(x => x.Status == "Donation");
        var paid = donations.Where(x => x.PaymentStatus == "Paid");
        var cash = paid.Where(x => x.PaymentProvider == "Cash");
        var monthStart = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var monthEnd = monthStart.AddMonths(1);
        var monthlyPaid = paid.Where(x => x.PaidAt >= monthStart && x.PaidAt < monthEnd);

        var rows = await donations
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new
            {
                x.Id, x.DisplayName, x.Message, x.Amount, x.PaymentStatus,
                x.PaymentProvider, x.Country, x.ChargedAmount, x.ChargedCurrency, x.CreatedAt, x.PaidAt,
                x.CashPointType, x.CashPointName
            })
            .ToListAsync(ct);

        return Ok(new
        {
            goalTnd = settings.MonthlyGoalTnd,
            annualGoalTnd = settings.AnnualGoalTnd,
            targetDonors = settings.TargetDonors,
            suggestedMonthlyContributionTnd = settings.SuggestedMonthlyContributionTnd,
            cashPaidTnd = await cash.SumAsync(x => x.Amount, ct),
            monthlyCashPaidTnd = await monthlyPaid.Where(x => x.PaymentProvider == "Cash").SumAsync(x => x.Amount, ct),
            cashPaidCount = await cash.CountAsync(ct),
            totalPaidTnd = await paid.SumAsync(x => x.Amount, ct),
            monthlyPaidTnd = await monthlyPaid.SumAsync(x => x.Amount, ct),
            pendingTnd = await donations.Where(x => x.PaymentStatus != "Paid").SumAsync(x => x.Amount, ct),
            paidCount = await paid.CountAsync(ct),
            pendingCount = await donations.CountAsync(x => x.PaymentStatus != "Paid", ct),
            donations = rows
        });
    }

    [HttpPost("{id:guid}/refund")]
    public async Task<IActionResult> Refund(Guid id, CancellationToken ct)
    {
        // No provider-initiated refund API is exposed by the current payment abstraction.
        // Keep this explicit rather than pretending a local status change is a bank refund.
        var donation = await db.SupporterBricks.SingleOrDefaultAsync(x => x.Id == id && x.Status == "Donation", ct);
        if (donation is null) return NotFound();
        if (donation.PaymentStatus != "Paid") return BadRequest(new { message = "Cette contribution n'est pas réglée." });

        await audit.LogAsync("DONATION_REFUND_REQUEST", "SupporterBrick", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { donation.PaymentProvider }, ct);

        return StatusCode(StatusCodes.Status409Conflict,
            new { message = "Le remboursement doit être effectué depuis le prestataire de paiement. La plateforme n'effectue aucun faux remboursement local." });
    }
}
