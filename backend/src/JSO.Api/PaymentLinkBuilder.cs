using Microsoft.AspNetCore.Http;

namespace JSO.Api;

// Resolves the public frontend base URL used to build the payment provider
// return/cancel landing pages. Shared by every fan-facing /pay endpoint (shop,
// tickets, supporters' wall) so the money-critical URL policy lives in one
// place.
//
// Prefers an explicit "Payments:PublicBaseUrl", then the first configured CORS
// origin. In Production these links are handed to the payment provider as
// post-payment landing pages, so we refuse to fall back to the (spoofable)
// request Host header: if neither an explicit base nor a CORS origin is
// configured we throw. In Development the Host-header fallback is kept for
// convenience.
public sealed class PaymentLinkBuilder(
    Microsoft.Extensions.Configuration.IConfiguration configuration,
    Microsoft.Extensions.Hosting.IHostEnvironment environment)
{
    // Throws InvalidOperationException in Production when no public base can be
    // resolved without trusting the Host header. Callers translate that into a
    // clean 503 the UI can handle.
    public string ResolvePublicBaseUrl(HttpRequest request)
    {
        var explicitBase = configuration["Payments:PublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(explicitBase))
            return explicitBase.TrimEnd('/');

        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (origins is { Length: > 0 } && !string.IsNullOrWhiteSpace(origins[0]))
            return origins[0].TrimEnd('/');

        if (environment.IsProduction())
            throw new InvalidOperationException(
                "Payments:PublicBaseUrl must be configured in Production; refusing to derive return URLs from the Host header.");

        return $"{request.Scheme}://{request.Host}";
    }
}
