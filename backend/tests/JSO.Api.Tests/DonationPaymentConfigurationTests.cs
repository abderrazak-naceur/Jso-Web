using JSO.Infrastructure.Payments;
using System.Text.Json;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JSO.Api.Tests;

public sealed class DonationPaymentConfigurationTests
{
    [Fact]
    public void Campaign_settings_validate_bounds_and_keep_the_annual_goal_consistent()
    {
        var settings = new DonationCampaignSettings(20m, 20000m, 1000);
        Assert.Null(settings.ValidationError);
        Assert.Equal(240000m, settings.AnnualGoalTnd);
        Assert.Equal(settings, JsonSerializer.Deserialize<DonationCampaignSettings>(JsonSerializer.Serialize(settings)));
        Assert.NotNull((settings with { SuggestedMonthlyContributionTnd = 0m }).ValidationError);
        Assert.NotNull((settings with { MonthlyGoalTnd = 0m }).ValidationError);
        Assert.NotNull((settings with { TargetDonors = 0 }).ValidationError);
    }

    [Fact]
    public void Stripe_requires_checkout_and_webhook_secrets()
    {
        var options = new StripeOptions { SecretKey = "test-key" };
        Assert.False(options.IsConfigured);

        options.WebhookSecret = "test-webhook-secret";
        Assert.True(options.IsConfigured);
    }

    [Fact]
    public void Flouci_requires_webhook_secret_in_production()
    {
        using var http = new HttpClient();
        var options = new PaymentOptions
        {
            Flouci = new FlouciOptions { AppToken = "test-token", AppSecret = "test-secret" }
        };
        var production = new FlouciPaymentProvider(
            http, Options.Create(options), NullLogger<FlouciPaymentProvider>.Instance,
            new TestEnvironment("Production"));
        Assert.False(production.IsConfigured);

        options.Flouci.WebhookSecret = "test-webhook-secret";
        Assert.True(production.IsConfigured);

        options.Flouci.WebhookSecret = "";
        var development = new FlouciPaymentProvider(
            http, Options.Create(options), NullLogger<FlouciPaymentProvider>.Instance,
            new TestEnvironment("Development"));
        Assert.True(development.IsConfigured);
    }

    private sealed class TestEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "JSO.Tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
