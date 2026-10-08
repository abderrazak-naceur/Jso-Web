using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/payment-config")]
public sealed class AdminPaymentConfigController(PaymentConfigurationStore store) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(new { providers = await store.ListAsync(ct) });

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PaymentProviderInput input, CancellationToken ct)
    {
        try { return Ok(await store.CreateAsync(input, ct)); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PaymentProviderInput input, CancellationToken ct)
    {
        try
        {
            var result = await store.UpdateAsync(id, input, ct);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        await store.DeleteAsync(id, ct) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/toggle")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var result = await store.ToggleAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("{id:guid}/test")]
    public async Task<IActionResult> Test(Guid id, CancellationToken ct)
    {
        var (provider, secrets) = await store.GetForServerAsync(id, ct);
        if (provider is null) return NotFound();
        if (!provider.IsActive) return BadRequest(new { success = false, message = "Le moyen de paiement est désactivé." });

        if (provider.Code == "STRIPE")
        {
            if (!secrets.TryGetValue("secretKey", out var key) || string.IsNullOrWhiteSpace(key))
                return Ok(new { success = false, message = "Clé secrète Stripe non configurée." });
            try
            {
                var service = new AccountService(new StripeClient(key));
                await service.GetAsync(cancellationToken: ct);
                return Ok(new { success = true, message = "Connexion Stripe valide." });
            }
            catch (StripeException)
            {
                return Ok(new { success = false, message = "Stripe a refusé la clé ou la connexion." });
            }
        }

        if (provider.Code == "FLOUCI")
        {
            var ok = secrets.TryGetValue("appToken", out var token) && !string.IsNullOrWhiteSpace(token)
                  && secrets.TryGetValue("appSecret", out var secret) && !string.IsNullOrWhiteSpace(secret);
            return Ok(new { success = ok, message = ok ? "Identifiants Flouci présents. Test API sans débit disponible via ce panneau." : "App Token / App Secret Flouci manquants." });
        }

        if (provider.Code == "PAYMEE")
        {
            var ok = secrets.TryGetValue("apiKey", out var apiKey) && !string.IsNullOrWhiteSpace(apiKey);
            if (!ok)
                return Ok(new { success = false, message = "Clé API Paymee manquante." });

            var settings = PaymeePaymentProvider.ReadSettings(provider.SettingsJson);
            var webhookOk = !string.IsNullOrWhiteSpace(settings.WebhookUrl);
            return Ok(new
            {
                success = webhookOk,
                message = webhookOk
                    ? "Configuration Paymee valide (clé API + webhook configurés)."
                    : "URL webhook Paymee manquante."
            });
        }

        if (provider.Code == "KONNECT")
        {
            if (!secrets.TryGetValue("apiKey", out var apiKey) || string.IsNullOrWhiteSpace(apiKey))
                return Ok(new { success = false, message = "Clé API Konnect manquante." });
            if (!secrets.TryGetValue("receiverWalletId", out var walletId) || string.IsNullOrWhiteSpace(walletId))
                return Ok(new { success = false, message = "Receiver Wallet ID Konnect manquant." });

            var baseUrl = string.IsNullOrWhiteSpace(provider.BaseUrl)
                ? "https://api.konnect.network/api/v2/"
                : provider.BaseUrl.TrimEnd('/') + "/";
            using var http = new HttpClient { BaseAddress = new Uri(baseUrl), Timeout = TimeSpan.FromSeconds(15) };
            using var request = new HttpRequestMessage(HttpMethod.Get, "payments/__jso_connection_test__");
            request.Headers.TryAddWithoutValidation("x-api-key", apiKey);
            using var response = await http.SendAsync(request, ct);

            var success = response.StatusCode == System.Net.HttpStatusCode.NotFound;
            var message = success
                ? "Connexion Konnect valide (clé API authentifiée)."
                : response.StatusCode == System.Net.HttpStatusCode.Unauthorized
                    ? "Konnect a refusé la clé API."
                    : $"Konnect a répondu HTTP {(int)response.StatusCode}.";
            return Ok(new { success, message });
        }

        return Ok(new { success = false, message = "Ce fournisseur est enregistré, mais son intégration de paiement n'est pas encore implémentée." });
    }
}
