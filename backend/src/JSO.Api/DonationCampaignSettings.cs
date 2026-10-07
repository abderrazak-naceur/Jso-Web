using System.Text.Json;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api;

public sealed record DonationCampaignSettings(decimal SuggestedMonthlyContributionTnd, decimal MonthlyGoalTnd, int TargetDonors)
{
    public const string ContentKey = "donation_campaign_settings";
    public static DonationCampaignSettings Default => new(10m, 10000m, 1000);
    public decimal AnnualGoalTnd => MonthlyGoalTnd * 12m;

    public string? ValidationError =>
        SuggestedMonthlyContributionTnd is < 1m or > 1_000_000m ? "La contribution suggérée doit être comprise entre 1 et 1 000 000 TND." :
        MonthlyGoalTnd is < 1m or > 10_000_000m ? "L'objectif mensuel doit être compris entre 1 et 10 000 000 TND." :
        TargetDonors is < 1 or > 1_000_000 ? "Le nombre de donateurs doit être compris entre 1 et 1 000 000." : null;

    public static async Task<DonationCampaignSettings> LoadAsync(JsoDbContext db, CancellationToken ct)
    {
        var value = await db.SiteContents.AsNoTracking()
            .Where(x => x.Key == ContentKey)
            .Select(x => x.Value)
            .SingleOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(value)) return Default;
        try
        {
            var settings = JsonSerializer.Deserialize<DonationCampaignSettings>(value);
            return settings is not null && settings.ValidationError is null ? settings : Default;
        }
        catch (JsonException)
        {
            return Default;
        }
    }

    public static async Task<SiteContent> SaveAsync(JsoDbContext db, DonationCampaignSettings settings, string? updatedBy, CancellationToken ct)
    {
        var row = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == ContentKey, ct);
        if (row is null)
        {
            row = new SiteContent { Key = ContentKey };
            db.SiteContents.Add(row);
        }
        row.Value = JsonSerializer.Serialize(settings);
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.UpdatedBy = updatedBy;
        await db.SaveChangesAsync(ct);
        return row;
    }
}
