using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace JSO.Api.Tests;

public sealed class PaymentProviderRegistrationTests
{
    [Fact]
    public void Public_payment_controllers_can_resolve_the_provider_selector()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=JSO;User Id=sa;Password=unused;TrustServerCertificate=True",
            ["Jwt:Key"] = new string('x', 32),
        }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddSingleton<IHostEnvironment>(new TestEnvironment());
        services.AddInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        var selector = scope.ServiceProvider.GetRequiredService<PaymentProviderSelector>();
        Assert.Same(selector.Flouci, selector.Select("TN", "FLOUCI"));
        Assert.Same(selector.Konnect, selector.Select("TN", "KONNECT"));
        Assert.Same(selector.Paymee, selector.Select("TN", "PAYMEE"));
        Assert.Same(selector.Stripe, selector.Select("FR", "STRIPE"));
        Assert.Null(selector.Select("FR", "FLOUCI"));
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "JSO.Tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
