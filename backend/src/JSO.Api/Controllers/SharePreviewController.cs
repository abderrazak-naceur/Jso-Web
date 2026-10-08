using System.Text.Encodings.Web;
using System.Text.Json;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// HTML for social crawlers. Human browsers are immediately sent to the
// canonical frontend page by JavaScript; the HTML remains usable without JS.
[ApiController]
[Route("api/share")]
public sealed class SharePreviewController(JsoDbContext db, PaymentLinkBuilder paymentLinks) : ControllerBase
{
    [HttpGet("{kind}/{key}")]
    public async Task<IActionResult> Get(string kind, string key, CancellationToken ct)
    {
        if (key.Length is < 1 or > 180) return NotFound();

        SharePreview? preview = null;
        switch (kind.ToLowerInvariant())
        {
            case "article":
                var article = await db.Articles.AsNoTracking()
                    .Where(x => x.Status == "Published" && x.Slug == key)
                    .Select(x => new { x.Title, x.Excerpt, x.CoverImageUrl })
                    .SingleOrDefaultAsync(ct);
                if (article is not null)
                    preview = new(article.Title, article.Excerpt, article.CoverImageUrl, "/actualites/" + Uri.EscapeDataString(key));
                break;
            case "product":
                var product = await db.Products.AsNoTracking()
                    .Where(x => x.IsActive && x.Slug == key)
                    .Select(x => new { x.Name, x.Description, x.ImageUrl })
                    .SingleOrDefaultAsync(ct);
                if (product is not null)
                    preview = new(product.Name, product.Description, product.ImageUrl, "/boutique/" + Uri.EscapeDataString(key));
                break;
            case "event":
                var ev = await db.ClubEvents.AsNoTracking()
                    .Where(x => x.IsPublished && x.Slug == key)
                    .Select(x => new { x.Title, x.Description })
                    .FirstOrDefaultAsync(ct);
                if (ev is not null)
                    preview = new(ev.Title, ev.Description, null, "/agenda/" + Uri.EscapeDataString(key));
                break;
            case "match" when Guid.TryParse(key, out var id):
                var match = await db.Matches.AsNoTracking()
                    .Where(x => x.IsPublished && x.Id == id)
                    .Select(x => new { x.OpponentName, x.IsHome, x.KickoffAt, x.Venue })
                    .SingleOrDefaultAsync(ct);
                if (match is not null)
                    preview = new(match.IsHome ? $"JSO — {match.OpponentName}" : $"{match.OpponentName} — JSO",
                        $"{match.KickoffAt:dd/MM/yyyy HH:mm} · {match.Venue ?? "Match JSO"}", null,
                        "/matchs/" + id);
                break;
        }

        if (preview is null) return NotFound();
        string baseUrl;
        try { baseUrl = paymentLinks.ResolvePublicBaseUrl(Request); }
        catch (InvalidOperationException) { return StatusCode(StatusCodes.Status503ServiceUnavailable); }
        var publicUrl = baseUrl + preview.Path;
        var imageUrl = ResolveImageUrl(baseUrl, preview.ImageUrl);
        Response.Headers.CacheControl = "public, max-age=300";
        Response.Headers["X-Robots-Tag"] = "noindex";
        return Content(RenderHtml(preview, publicUrl, imageUrl), "text/html; charset=utf-8");
    }

    private static string ResolveImageUrl(string baseUrl, string? value)
    {
        if (Uri.TryCreate(value, UriKind.Absolute, out var absolute) && absolute.Scheme == Uri.UriSchemeHttps)
            return absolute.ToString();
        if (!string.IsNullOrWhiteSpace(value) && value.StartsWith('/') && !value.StartsWith("//"))
            return baseUrl + value;
        return baseUrl + "/JSO-official-crest.png";
    }

    public static string RenderHtml(SharePreview preview, string publicUrl, string imageUrl)
    {
        var html = HtmlEncoder.Default;
        var title = html.Encode(preview.Title + " · JSO");
        var description = html.Encode(string.IsNullOrWhiteSpace(preview.Description)
            ? "Jeunesse Sportive de Oudhref" : preview.Description[..Math.Min(preview.Description.Length, 240)]);
        var url = html.Encode(publicUrl);
        var image = html.Encode(imageUrl);
        var redirect = JsonSerializer.Serialize(publicUrl);
        return $"""
            <!doctype html><html lang="fr"><head><meta charset="utf-8">
            <title>{title}</title><link rel="canonical" href="{url}">
            <meta name="description" content="{description}">
            <meta property="og:type" content="website"><meta property="og:title" content="{title}">
            <meta property="og:description" content="{description}"><meta property="og:url" content="{url}">
            <meta property="og:image" content="{image}"><meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{description}">
            <meta name="twitter:image" content="{image}">
            <script>window.location.replace({redirect});</script></head>
            <body><p><a href="{url}">Ouvrir sur le site JSO</a></p></body></html>
            """;
    }
}

public sealed record SharePreview(string Title, string? Description, string? ImageUrl, string Path);
