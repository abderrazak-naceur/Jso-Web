using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JSO.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JSO.Infrastructure.Payments;

public sealed class PaymentConfigurationStore
{
    private const string Key = "__system.payment-providers.v2";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly JsoDbContext _db;
    private readonly byte[] _key;

    public PaymentConfigurationStore(JsoDbContext db, IConfiguration configuration)
    {
        _db = db;
        var jwtKey = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
            throw new InvalidOperationException("Jwt:Key must be configured (minimum 32 characters) for payment secret encryption.");
        _key = SHA256.HashData(Encoding.UTF8.GetBytes("JSO.PaymentConfiguration.v2|" + jwtKey));
    }

    public async Task<IReadOnlyList<PaymentProviderRecord>> ListAsync(CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        return settings.Providers.Select(ToPublic).OrderBy(x => x.SortOrder).ThenBy(x => x.Name).ToList();
    }

    public async Task<PaymentProviderRecord?> GetAsync(Guid id, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var p = settings.Providers.FirstOrDefault(x => x.Id == id);
        return p is null ? null : ToPublic(p);
    }

    public async Task<PaymentProviderRecord> CreateAsync(PaymentProviderInput input, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var code = NormalizeCode(input.Code);
        if (settings.Providers.Any(x => string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Un moyen de paiement avec le code '{code}' existe déjà.");

        var p = FromInput(input, Guid.NewGuid());
        settings.Providers.Add(p);
        await WriteAsync(settings, ct);
        return ToPublic(p);
    }

    public async Task<PaymentProviderRecord?> UpdateAsync(Guid id, PaymentProviderInput input, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var p = settings.Providers.FirstOrDefault(x => x.Id == id);
        if (p is null) return null;

        var code = NormalizeCode(input.Code);
        if (settings.Providers.Any(x => x.Id != id && string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException($"Un moyen de paiement avec le code '{code}' existe déjà.");

        p.Code = code;
        p.Name = input.Name.Trim();
        p.Type = input.Type.Trim();
        p.Country = input.Country?.Trim().ToUpperInvariant();
        p.Currency = input.Currency.Trim().ToUpperInvariant();
        p.BaseUrl = input.BaseUrl?.Trim();
        p.IsActive = input.IsActive;
        p.SortOrder = input.SortOrder;
        p.SettingsJson = input.SettingsJson;

        if (input.Secrets.Any(x => !string.IsNullOrWhiteSpace(x.Value)))
        {
            var current = DecryptSecrets(p.Secrets);
            foreach (var pair in input.Secrets)
                if (!string.IsNullOrWhiteSpace(pair.Value))
                    current[pair.Key.Trim()] = pair.Value;
            p.Secrets = EncryptSecrets(current);
        }

        await WriteAsync(settings, ct);
        return ToPublic(p);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var removed = settings.Providers.RemoveAll(x => x.Id == id) > 0;
        if (removed) await WriteAsync(settings, ct);
        return removed;
    }

    public async Task<PaymentProviderRecord?> ToggleAsync(Guid id, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var p = settings.Providers.FirstOrDefault(x => x.Id == id);
        if (p is null) return null;
        p.IsActive = !p.IsActive;
        await WriteAsync(settings, ct);
        return ToPublic(p);
    }

    public async Task<(StoredProvider? Provider, IReadOnlyDictionary<string, string> Secrets)> GetForServerAsync(Guid id, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var p = settings.Providers.FirstOrDefault(x => x.Id == id);
        return (p, p is null ? new Dictionary<string, string>() : DecryptSecrets(p.Secrets));
    }

    // Runtime provider activation is persisted in the admin payment configuration.
    public bool HasActiveConfiguredByCode(string code)
    {
        var row = _db.SiteContents.AsNoTracking().FirstOrDefault(x => x.Key == Key);
        if (row is null || string.IsNullOrWhiteSpace(row.Value)) return false;

        try
        {
            var settings = JsonSerializer.Deserialize<StoredSettings>(row.Value, JsonOptions);
            var p = settings?.Providers.FirstOrDefault(x =>
                x.IsActive && string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase));
            if (p is null) return false;
            var secrets = DecryptSecrets(p.Secrets);
            bool Has(string key) => secrets.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value);
            return code.ToUpperInvariant() switch
            {
                "KONNECT" => Has("apiKey") && Has("receiverWalletId") &&
                    !string.IsNullOrWhiteSpace(KonnectPaymentProvider.ReadSettings(p.SettingsJson).WebhookUrl),
                "PAYMEE" => Has("apiKey") &&
                    !string.IsNullOrWhiteSpace(PaymeePaymentProvider.ReadSettings(p.SettingsJson).WebhookUrl),
                _ => secrets.Count > 0,
            };
        }
        catch (JsonException)
        {
            return false;
        }
        catch (CryptographicException)
        {
            return false;
        }
    }

    public async Task<(StoredProvider? Provider, IReadOnlyDictionary<string, string> Secrets)> GetActiveForServerByCodeAsync(
        string code, CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        var p = settings.Providers.FirstOrDefault(x =>
            x.IsActive && string.Equals(x.Code, code, StringComparison.OrdinalIgnoreCase));

        return (p, p is null ? new Dictionary<string, string>() : DecryptSecrets(p.Secrets));
    }

    private StoredProvider FromInput(PaymentProviderInput input, Guid id) => new()
    {
        Id = id,
        Code = NormalizeCode(input.Code),
        Name = input.Name.Trim(),
        Type = input.Type.Trim(),
        Country = input.Country?.Trim().ToUpperInvariant(),
        Currency = input.Currency.Trim().ToUpperInvariant(),
        BaseUrl = input.BaseUrl?.Trim(),
        IsActive = input.IsActive,
        SortOrder = input.SortOrder,
        SettingsJson = input.SettingsJson,
        Secrets = EncryptSecrets(input.Secrets)
    };

    private async Task<StoredSettings> ReadAsync(CancellationToken ct)
    {
        var row = await _db.SiteContents.AsNoTracking().FirstOrDefaultAsync(x => x.Key == Key, ct);
        if (row is null || string.IsNullOrWhiteSpace(row.Value)) return new StoredSettings();

        try
        {
            return JsonSerializer.Deserialize<StoredSettings>(row.Value, JsonOptions) ?? new StoredSettings();
        }
        catch (JsonException)
        {
            return new StoredSettings();
        }
    }

    private async Task WriteAsync(StoredSettings settings, CancellationToken ct)
    {
        var value = JsonSerializer.Serialize(settings, JsonOptions);
        var row = await _db.SiteContents.FirstOrDefaultAsync(x => x.Key == Key, ct);

        if (row is null)
            _db.SiteContents.Add(new SiteContent { Key = Key, Value = value, UpdatedAt = DateTimeOffset.UtcNow });
        else
        {
            row.Value = value;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    private PaymentProviderRecord ToPublic(StoredProvider p) => new(
        p.Id, p.Code, p.Name, p.Type, p.Country, p.Currency, p.BaseUrl,
        p.IsActive, p.SortOrder,
        DecryptSecrets(p.Secrets).ToDictionary(x => x.Key, _ => true),
        p.SettingsJson);

    private Dictionary<string, string> DecryptSecrets(string? encoded)
    {
        if (string.IsNullOrWhiteSpace(encoded)) return new();

        try
        {
            var all = Convert.FromBase64String(encoded);
            if (all.Length < 28) return new();

            var nonce = all.AsSpan(0, 12);
            var tag = all.AsSpan(12, 16);
            var cipher = all.AsSpan(28);
            var plain = new byte[cipher.Length];

            using var aes = new AesGcm(_key, 16);
            aes.Decrypt(nonce, cipher, tag, plain);

            return JsonSerializer.Deserialize<Dictionary<string, string>>(plain, JsonOptions) ?? new();
        }
        catch (CryptographicException) { return new(); }
        catch (FormatException) { return new(); }
        catch (JsonException) { return new(); }
    }

    private string EncryptSecrets(IReadOnlyDictionary<string, string> secrets)
    {
        var filtered = secrets.Where(x => !string.IsNullOrWhiteSpace(x.Value))
            .ToDictionary(x => x.Key.Trim(), x => x.Value);

        if (filtered.Count == 0) return "";

        var plain = JsonSerializer.SerializeToUtf8Bytes(filtered, JsonOptions);
        var nonce = RandomNumberGenerator.GetBytes(12);
        var cipher = new byte[plain.Length];
        var tag = new byte[16];

        using var aes = new AesGcm(_key, 16);
        aes.Encrypt(nonce, plain, cipher, tag);

        return Convert.ToBase64String(nonce.Concat(tag).Concat(cipher).ToArray());
    }

    private static string NormalizeCode(string value)
    {
        var code = value.Trim().ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(code) || code.Length > 40)
            throw new ArgumentException("Code fournisseur invalide.");
        return code;
    }

    private sealed class StoredSettings { public List<StoredProvider> Providers { get; set; } = new(); }

    public sealed class StoredProvider
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Type { get; set; } = "Hosted";
        public string? Country { get; set; }
        public string Currency { get; set; } = "TND";
        public string? BaseUrl { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public string? SettingsJson { get; set; }
        public string? Secrets { get; set; }
    }
}

public sealed record PaymentProviderRecord(
    Guid Id, string Code, string Name, string Type, string? Country, string Currency,
    string? BaseUrl, bool IsActive, int SortOrder,
    IReadOnlyDictionary<string, bool> SecretsConfigured, string? SettingsJson);

public sealed record PaymentProviderInput(
    string Code, string Name, string Type, string? Country, string Currency,
    string? BaseUrl, bool IsActive, int SortOrder, string? SettingsJson,
    IReadOnlyDictionary<string, string> Secrets);

public sealed record PaymentSettingsInput(FlouciSettingsInput Flouci, StripeSettingsInput Stripe);
public sealed record FlouciSettingsInput(string BaseUrl, string? DeveloperTrackingId, int SessionTimeoutSeconds);
public sealed record StripeSettingsInput(string Currency, decimal TndToStripeRate);
