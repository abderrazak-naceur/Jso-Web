using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/payment-config")]
public sealed class AdminPaymentConfigController(IOptions<PaymentOptions> options) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var p = options.Value;
        return Ok(new {
            flouci = new { configured = p.Flouci.IsConfigured, baseUrl = p.Flouci.BaseUrl, webhookSecretConfigured = !string.IsNullOrWhiteSpace(p.Flouci.WebhookSecret), variables = new[] { "Payments__Flouci__AppToken", "Payments__Flouci__AppSecret", "Payments__Flouci__WebhookSecret", "Payments__Flouci__DeveloperTrackingId" } },
            stripe = new { configured = p.Stripe.IsConfigured, currency = p.Stripe.Currency, rate = p.Stripe.TndToStripeRate, variables = new[] { "Payments__Stripe__SecretKey", "Payments__Stripe__WebhookSecret", "Payments__Stripe__Currency", "Payments__Stripe__TndToStripeRate" } },
            cash = new { configured = true, description = "Dons en espèces auprès des vendeurs et boutiques autorisés." },
            bankTransfer = new { configured = false, description = "À activer avec les coordonnées bancaires du club et une procédure de rapprochement." },
            ipay = new { configured = false, description = "D17 / e-DINAR / ClicToPay / autres moyens iPay nécessitent les identifiants et le contrat du prestataire." }
        });
    }
}