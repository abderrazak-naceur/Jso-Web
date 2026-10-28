using System.Text.Json;

namespace JSO.Api.Controllers;

internal static class TicketDesignDocumentValidator
{
    private const int MaxArtboards = 8;
    private const int MaxLayersPerArtboard = 100;
    private static readonly HashSet<string> LayerTypes = new(StringComparer.Ordinal)
    {
        "text", "image", "qr", "shape"
    };
    private static readonly HashSet<string> Fonts = new(StringComparer.OrdinalIgnoreCase)
    {
        "Archivo Black", "Oswald", "Inter", "Arial", "sans-serif"
    };
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

    public static string? Validate(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return "Le projet doit être un objet JSON.";
        if (!root.TryGetProperty("schemaVersion", out var schema)
            || schema.ValueKind != JsonValueKind.Number
            || !schema.TryGetInt32(out var version)
            || version != 1)
            return "Version de projet non prise en charge.";
        if (!root.TryGetProperty("artboards", out var artboards)
            || artboards.ValueKind != JsonValueKind.Array
            || artboards.GetArrayLength() is < 1 or > MaxArtboards)
            return $"Le projet doit contenir entre 1 et {MaxArtboards} formats.";

        var artboardIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var artboard in artboards.EnumerateArray())
        {
            if (artboard.ValueKind != JsonValueKind.Object) return "Format de planche invalide.";
            if (!TryBoundedString(artboard, "id", 1, 100, out var artboardId)) return "Identifiant de format invalide.";
            if (!artboardIds.Add(artboardId!)) return "Chaque format doit avoir un identifiant unique.";
            if (!TryNumber(artboard, "width", 240, 4096, out var width)
                || !TryNumber(artboard, "height", 240, 4096, out var height)
                || width * height > 16_777_216)
                return "Dimensions de format invalides.";
            if (!artboard.TryGetProperty("layers", out var layers)
                || layers.ValueKind != JsonValueKind.Array
                || layers.GetArrayLength() > MaxLayersPerArtboard)
                return $"Un format ne peut pas contenir plus de {MaxLayersPerArtboard} calques.";

            var layerIds = new HashSet<string>(StringComparer.Ordinal);
            foreach (var layer in layers.EnumerateArray())
            {
                if (layer.ValueKind != JsonValueKind.Object) return "Calque invalide.";
                if (!TryBoundedString(layer, "id", 1, 100, out var layerId) || !layerIds.Add(layerId!))
                    return "Chaque calque doit avoir un identifiant unique.";
                if (!TryBoundedString(layer, "type", 1, 20, out var type) || !LayerTypes.Contains(type!))
                    return "Type de calque non autorisé.";
                if (!ValidateGeometry(layer)) return "Position, taille ou opacité de calque invalide.";
                if (TryOptionalString(layer, "name", 120) is false) return "Nom de calque trop long.";

                if (type == "text")
                {
                    if (!TryBoundedString(layer, "text", 0, 4096, out _)) return "Texte de calque trop long.";
                    if (layer.TryGetProperty("fontFamily", out var font)
                        && (font.ValueKind != JsonValueKind.String || !Fonts.Contains(font.GetString() ?? "")))
                        return "Police de caractères non autorisée.";
                    if (layer.TryGetProperty("fontSize", out var fontSize)
                        && (!fontSize.TryGetDouble(out var size) || size is < 6 or > 500))
                        return "Taille de police invalide.";
                }
                else if (type == "image")
                {
                    if (!layer.TryGetProperty("source", out var source) || source.ValueKind != JsonValueKind.Object)
                        return "Source d’image manquante.";
                    if (!TryBoundedString(source, "kind", 1, 20, out var kind) || kind is not ("url" or "binding"))
                        return "Type de source d’image invalide.";
                    if (kind == "url")
                    {
                        if (!TryBoundedString(source, "url", 1, 2048, out var url) || ValidateAssetUrl(url) is not null)
                            return "URL d’image non autorisée.";
                    }
                    else if (!TryBoundedString(source, "key", 1, 120, out var key) || !IsAllowedBinding(key!))
                        return "Référence d’image non autorisée.";
                }
                else if (type == "qr")
                {
                    if (!TryBoundedString(layer, "value", 1, 2048, out var value)
                        || value!.Contains("publicTicketToken", StringComparison.OrdinalIgnoreCase)
                        || value.Contains("order.", StringComparison.OrdinalIgnoreCase))
                        return "Le QR promotionnel ne peut pas contenir un jeton de billet individuel.";
                }
            }
        }

        if (root.TryGetProperty("activeArtboardId", out var active)
            && (active.ValueKind != JsonValueKind.String || !artboardIds.Contains(active.GetString() ?? "")))
            return "Le format actif est introuvable.";
        return null;
    }

    public static string? ValidateAssetUrl(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var url = value.Trim();
        if (url.Length > 2048) return "L’URL de l’image est trop longue.";
        if (url.StartsWith('/') && !url.StartsWith("//") && !url.Contains('\\')) return null;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || !AllowedHosts.Contains(uri.Host))
            return "L’image doit utiliser un chemin du site ou un hébergeur média JSO autorisé.";
        return null;
    }

    private static bool ValidateGeometry(JsonElement layer)
    {
        foreach (var (name, min, max) in new[]
        {
            ("x", -8192d, 8192d), ("y", -8192d, 8192d),
            ("width", 1d, 8192d), ("height", 1d, 8192d),
            ("rotation", -3600d, 3600d), ("opacity", 0d, 1d)
        })
        {
            if (layer.TryGetProperty(name, out var property)
                && (property.ValueKind != JsonValueKind.Number
                    || !property.TryGetDouble(out var value)
                    || !double.IsFinite(value)
                    || value < min || value > max))
                return false;
        }
        return true;
    }

    private static bool IsAllowedBinding(string key) => key.StartsWith("match.", StringComparison.Ordinal)
        || key.StartsWith("variables.", StringComparison.Ordinal);

    private static bool TryNumber(JsonElement element, string name, double min, double max, out double value)
    {
        value = 0;
        return element.TryGetProperty(name, out var property)
            && property.ValueKind == JsonValueKind.Number
            && property.TryGetDouble(out value)
            && double.IsFinite(value)
            && value >= min && value <= max;
    }

    private static bool TryBoundedString(JsonElement element, string name, int min, int max, out string? value)
    {
        value = null;
        if (!element.TryGetProperty(name, out var property) || property.ValueKind != JsonValueKind.String) return false;
        value = property.GetString();
        return value is not null && value.Length >= min && value.Length <= max;
    }

    private static bool TryOptionalString(JsonElement element, string name, int max)
    {
        if (!element.TryGetProperty(name, out var property)) return true;
        return property.ValueKind == JsonValueKind.String && (property.GetString()?.Length ?? 0) <= max;
    }
}
