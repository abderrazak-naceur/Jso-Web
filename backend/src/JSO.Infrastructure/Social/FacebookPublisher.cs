using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace JSO.Infrastructure.Social;

// Result of an auto-publish attempt. Success carries the created Facebook post
// id; failure carries a human-readable, non-sensitive reason the admin UI can
// surface. NotConfigured is the expected state until the club supplies a Page
// token, and the caller turns it into a clear 400 (never a 500).
public sealed record FacebookPublishResult(bool Success, bool NotConfigured, string? PostId, string Message)
{
    public static FacebookPublishResult Ok(string postId) =>
        new(true, false, postId, "Publié sur la Page Facebook du club.");
    public static FacebookPublishResult Missing() =>
        new(false, true, null, "La publication automatique Facebook n’est pas configurée (jeton de Page manquant).");
    public static FacebookPublishResult Failed(string message) =>
        new(false, false, null, message);
}

// Posts a link + message to the club's Facebook Page via the Graph API.
//
// Auto-posting requires a Meta app, the pages_manage_posts permission and a
// long-lived Page access token — all configured out-of-band via the "Social"
// settings (environment variables in production). When no token is configured
// the service returns NotConfigured so the UI can fall back to manual sharing.
//
// Only a public article link and its title/excerpt are ever sent: no personal
// data, and the token is used solely as a Graph query parameter, never logged.
public sealed class FacebookPublisher(HttpClient http, IOptions<SocialOptions> options)
{
    private readonly SocialOptions _options = options.Value;

    public bool IsConfigured => _options.Facebook.IsConfigured;

    // Builds the absolute, shareable article URL from the configured site URL.
    public string BuildArticleUrl(string slug)
    {
        var baseUrl = _options.PublicSiteUrl.TrimEnd('/');
        return $"{baseUrl}/actualites/{Uri.EscapeDataString(slug)}";
    }

    public async Task<FacebookPublishResult> PublishArticleAsync(string title, string? excerpt, string slug, CancellationToken ct)
    {
        var fb = _options.Facebook;
        if (!fb.IsConfigured) return FacebookPublishResult.Missing();
        if (string.IsNullOrWhiteSpace(_options.PublicSiteUrl))
            return FacebookPublishResult.Failed("L’URL publique du site (Social:PublicSiteUrl) n’est pas configurée.");

        var link = BuildArticleUrl(slug);
        // The caption Facebook shows above the link card. The rich preview
        // (image/title/description) itself comes from the page's Open Graph tags.
        var message = string.IsNullOrWhiteSpace(excerpt) ? title : $"{title}\n\n{excerpt}";

        var endpoint = $"{fb.GraphApiVersion}/{fb.PageId}/feed";
        var payload = new Dictionary<string, string>
        {
            ["message"] = message,
            ["link"] = link,
            ["access_token"] = fb.PageAccessToken,
        };

        try
        {
            using var response = await http.PostAsync(endpoint, new FormUrlEncodedContent(payload), ct);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadFromJsonAsync<GraphPostResponse>(cancellationToken: ct);
                return FacebookPublishResult.Ok(body?.Id ?? "(inconnu)");
            }

            // Surface Graph's own error message when present, without leaking the token.
            var error = await response.Content.ReadFromJsonAsync<GraphErrorResponse>(cancellationToken: ct);
            var reason = error?.Error?.Message ?? $"HTTP {(int)response.StatusCode}";
            return FacebookPublishResult.Failed($"Facebook a refusé la publication : {reason}");
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return FacebookPublishResult.Failed("Facebook est injoignable pour le moment. Réessayez plus tard.");
        }
    }

    private sealed record GraphPostResponse(string? Id);
    private sealed record GraphErrorResponse(GraphError? Error);
    private sealed record GraphError(string? Message, int? Code);
}
