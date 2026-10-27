using Microsoft.AspNetCore.Mvc;

namespace JSO.Api.Controllers;

// Read-only image proxy for the ticket designer (and any canvas-based tool).
// The SFTP static media host does not send CORS headers: a cross-origin image
// drawn on a canvas taints it and blocks export (canvas.toBlob throws a
// SecurityError). Fetching the image server-side and re-serving it same-origin
// keeps the canvas exportable.
//
// Security: this must never become an open proxy. Only HTTPS URLs on known JSO
// media hosts are allowed, only image content types are returned, and payloads
// are capped. No authentication is required because the proxied assets are
// public images already visible on the site; abuse is bounded by the host
// whitelist, the size cap and the public-api rate limiter.
[ApiController]
[Route("api/media")]
public sealed class MediaProxyController(IHttpClientFactory httpClientFactory) : ControllerBase
{
    private const long MaxBytes = 12L * 1024 * 1024;

    private static readonly HashSet<string> AllowedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "media.jsoudhref.com",
        "jso-media-api.onrender.com",
        "jso-media.com",
        "www.jso-media.com",
        "jso-api.onrender.com",
        "jsoudhref.com",
        "www.jsoudhref.com"
    };

    [HttpGet("proxy")]
    public async Task<IActionResult> Proxy([FromQuery] string? url, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(url)
            || !Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps)
            return BadRequest(new { message = "Une URL HTTPS complète est requise." });

        if (!AllowedHosts.Contains(uri.Host))
            return BadRequest(new { message = "Cet hébergeur d’images n’est pas autorisé." });

        var client = httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(10);
        client.MaxResponseContentBufferSize = MaxBytes;

        HttpResponseMessage upstream;
        try
        {
            upstream = await client.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "L’image est momentanément inaccessible depuis l’hébergeur." });
        }

        using (upstream)
        {
            if (!upstream.IsSuccessStatusCode)
                return StatusCode((int)upstream.StatusCode, new { message = "L’hébergeur a refusé l’image." });

            var contentType = upstream.Content.Headers.ContentType?.MediaType;
            if (contentType is not ("image/jpeg" or "image/png" or "image/webp" or "image/gif"))
                return BadRequest(new { message = "Le contenu distant n’est pas une image." });

            var bytes = await upstream.Content.ReadAsByteArrayAsync(ct);
            if (bytes.Length == 0 || bytes.Length > MaxBytes)
                return BadRequest(new { message = "L’image dépasse la taille maximale autorisée." });

            Response.Headers.CacheControl = "public, max-age=86400";
            return File(bytes, contentType);
        }
    }
}
