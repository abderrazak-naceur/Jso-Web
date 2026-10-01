using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure;

public sealed class ContentTranslationService(JsoDbContext db)
{
    public const string DefaultLanguage = "fr";
    public static readonly string[] SupportedLanguages = ["fr", "en", "it", "ar"];

    public static string NormalizeLanguage(string? value)
    {
        var code = (value ?? string.Empty).Trim().ToLowerInvariant().Split('-', 2)[0];
        return SupportedLanguages.Contains(code) ? code : DefaultLanguage;
    }

    public static string GetRequestLanguage(HttpRequest request)
    {
        var header = request.Headers.AcceptLanguage.ToString();
        var candidate = header.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.Split(';', 2)[0])
            .FirstOrDefault();

        return NormalizeLanguage(candidate);
    }

    public static string Key(string entityType, Guid entityId, string language, string field) =>
        $"i18n:{entityType}:{entityId}:{NormalizeLanguage(language)}:{field.Trim().ToLowerInvariant()}";

    public static string Key(string entityType, string entityKey, string language, string field) =>
        $"i18n:{entityType}:{entityKey}:{NormalizeLanguage(language)}:{field.Trim().ToLowerInvariant()}";

    public async Task<string> ResolveAsync(
        string entityType,
        Guid entityId,
        string field,
        string? original,
        string language,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(original)) return original ?? string.Empty;

        var requested = NormalizeLanguage(language);
        var keys = new[] { Key(entityType, entityId, requested, field), Key(entityType, entityId, DefaultLanguage, field) }
            .Distinct();

        var values = await db.SiteContents.AsNoTracking()
            .Where(x => keys.Contains(x.Key) && x.Value != null)
            .ToDictionaryAsync(x => x.Key, x => x.Value, ct);

        foreach (var key in keys)
        {
            if (values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value))
                return value;
        }

        return original;
    }

    public async Task<IReadOnlyDictionary<string, string>> LoadAsync(
        string entityType,
        IEnumerable<Guid> entityIds,
        IEnumerable<string> fields,
        string language,
        CancellationToken ct)
    {
        var ids = entityIds.Distinct().ToArray();
        var requested = NormalizeLanguage(language);
        if (ids.Length == 0) return new Dictionary<string, string>();

        var fieldSet = fields.Select(x => x.Trim().ToLowerInvariant()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var prefix = $"i18n:{entityType}:";
        var rows = await db.SiteContents.AsNoTracking()
            .Where(x => x.Key.StartsWith(prefix))
            .ToListAsync(ct);

        var idSet = ids.Select(x => x.ToString()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return rows
            .Select(x => new { x.Key, x.Value })
            .Where(x =>
            {
                var parts = x.Key.Split(':', 5);
                return parts.Length == 5
                    && idSet.Contains(parts[2])
                    && fieldSet.Contains(parts[4]);
            })
            .GroupBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(x => x.Key, x => x.Last().Value, StringComparer.OrdinalIgnoreCase);
    }

    
    public async Task<IReadOnlyDictionary<string, string>> LoadNamedAsync(
        string entityType,
        IEnumerable<string> entityKeys,
        string field,
        string language,
        CancellationToken ct)
    {
        var keys = entityKeys.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (keys.Length == 0) return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var requested = NormalizeLanguage(language);
        var storageKeys = keys
            .SelectMany(key => new[]
            {
                Key(entityType, key, requested, field),
                Key(entityType, key, DefaultLanguage, field)
            })
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var rows = await db.SiteContents.AsNoTracking()
            .Where(x => storageKeys.Contains(x.Key))
            .ToListAsync(ct);

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var entityKey in keys)
        {
            var requestedKey = Key(entityType, entityKey, requested, field);
            var frenchKey = Key(entityType, entityKey, DefaultLanguage, field);
            var value = rows.FirstOrDefault(x => string.Equals(x.Key, requestedKey, StringComparison.OrdinalIgnoreCase))?.Value;
            value ??= rows.FirstOrDefault(x => string.Equals(x.Key, frenchKey, StringComparison.OrdinalIgnoreCase))?.Value;
            if (!string.IsNullOrWhiteSpace(value))
                result[entityKey] = value;
        }

        return result;
    }

    public static string ResolveFromMap(
        IReadOnlyDictionary<string, string> translations,
        string entityType,
        Guid entityId,
        string field,
        string? original,
        string language)
    {
        if (string.IsNullOrWhiteSpace(original)) return original ?? string.Empty;
        var requested = NormalizeLanguage(language);

        var requestedKey = Key(entityType, entityId, requested, field);
        if (translations.TryGetValue(requestedKey, out var requestedValue) && !string.IsNullOrWhiteSpace(requestedValue))
            return requestedValue;

        var frenchKey = Key(entityType, entityId, DefaultLanguage, field);
        if (translations.TryGetValue(frenchKey, out var frenchValue) && !string.IsNullOrWhiteSpace(frenchValue))
            return frenchValue;

        return original;
    }
}
