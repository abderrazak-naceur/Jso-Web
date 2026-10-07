namespace JSO.Infrastructure.Social;

// Strongly-typed binding of the "Social" configuration section. As with
// payments, every secret is read from IConfiguration (environment variables in
// production). The repository only ships empty placeholders; a real Page access
// token is NEVER committed and is NEVER logged.
public sealed class SocialOptions
{
    public const string SectionName = "Social";

    public FacebookOptions Facebook { get; set; } = new();
    public WhatsAppOptions WhatsApp { get; set; } = new();

    // Public base URL of the site, used to build the shareable article link that
    // is attached to a social post (e.g. "https://jso-oudhref.tn"). No trailing
    // slash is required; it is trimmed when composing links.
    public string PublicSiteUrl { get; set; } = "";
}

public sealed class FacebookOptions
{
    // Graph API version and the target Page. PageId + PageAccessToken are issued
    // from a Facebook (Meta) app once the club grants the pages_manage_posts
    // permission. Both are empty in the repo and supplied via environment
    // variables in production.
    public string GraphApiVersion { get; set; } = "v21.0";
    public string PageId { get; set; } = "";
    public string PageAccessToken { get; set; } = "";

    // Auto-publishing is only attempted when a Page id and token are present.
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PageId) && !string.IsNullOrWhiteSpace(PageAccessToken);
}
