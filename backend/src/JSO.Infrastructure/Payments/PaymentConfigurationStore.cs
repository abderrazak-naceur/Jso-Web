using System.Text.Json;
using JSO.Domain;
using Microsoft.EntityFrameworkCore;

namespace JSO.Infrastructure.Payments;

/// <summary>
/// Persistent, non-secret payment settings. Provider credentials remain in the
/// deployment secret store (Render environment) and are never copied to the DB.
/// </summary>
public sealed class PaymentConfigurationStore(JsoDbContext db)
{
    private const string Key = "__system.payment-settings.v1";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<StoredPaymentSettings?> GetAsync(CancellationToken ct = default)
    {
        var row = await db.SiteContents.AsNoTracking().SingleOrDefaultAsync(x => x.Key == Key, ct);
        if (row is null || string.IsNullOrWhiteSpace(row.Value)) return null;
        try { return JsonSerializer.Deserialize<StoredPaymentSettings>(row.Value, JsonOptions); }
        catch (JsonException) { return null; }
    }

    public async Task SaveAsync(PaymentSettingsInput input, CancellationToken ct = default)
    {
        var value = JsonSerializer.Serialize(new StoredPaymentSettings(
            input.Flouci.BaseUrl.Trim(),
            input.Flouci.DeveloperTrackingId?.Trim(),
            input.Flouci.SessionTimeoutSeconds,
            input.Stripe.Currency.Trim().ToLowerInvariant(),
            input.Stripe.TndToStripeRate), JsonOptions);

        var row = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == Key, ct);
        if (row is null)
            db.SiteContents.Add(new SiteContent { Key = Key, Value = value, UpdatedAt = DateTimeOffset.UtcNow });
        else
        {
            row.Value = value;
            row.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }
}

public sealed record StoredPaymentSettings(
    string? FlouciBaseUrl,
    string? FlouciDeveloperTrackingId,
    int? FlouciSessionTimeoutSeconds,
    string? StripeCurrency,
    decimal? StripeTndToStripeRate);

public sealed record PaymentSettingsInput(
    FlouciSettingsInput Flouci,
    StripeSettingsInput Stripe);

public sealed record FlouciSettingsInput(
    string BaseUrl,
    string? DeveloperTrackingId,
    int SessionTimeoutSeconds);

public sealed record StripeSettingsInput(
    string Currency,
    decimal TndToStripeRate);
