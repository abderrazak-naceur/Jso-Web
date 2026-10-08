using JSO.Infrastructure.Payments;
using JSO.Infrastructure.Social;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace JSO.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

        var provider = configuration["Database:Provider"]?.Trim().ToLowerInvariant() ?? "sqlserver";

        services.AddDbContext<JsoDbContext>(options =>
        {
            switch (provider)
            {
                case "postgres":
                case "postgresql":
                    var postgresBuilder = new Npgsql.NpgsqlConnectionStringBuilder(cs);

                    // Render services in the same region/workspace should use the
                    // private Postgres endpoint. When Database:Host is supplied
                    // (Render production), override the public host and disable
                    // TLS because private-network connections do not require it.
                    var renderInternalHost = configuration["Database:Host"]?.Trim();
                    if (!string.IsNullOrWhiteSpace(renderInternalHost))
                    {
                        postgresBuilder.Host = renderInternalHost;
                        postgresBuilder.SslMode = Npgsql.SslMode.Disable;
                    }
                    else if (postgresBuilder.SslMode == Npgsql.SslMode.Prefer &&
                             string.Equals(configuration["ASPNETCORE_ENVIRONMENT"], "Production", StringComparison.OrdinalIgnoreCase))
                    {
                        // External production connections default to TLS, while an
                        // explicit Ssl Mode in the connection string remains authoritative.
                        postgresBuilder.SslMode = Npgsql.SslMode.Require;
                    }

                    options.UseNpgsql(postgresBuilder.ConnectionString);
                    break;
                case "sqlserver":
                    options.UseSqlServer(cs);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider '{provider}'. Use 'sqlserver' or 'postgres'.");
            }
        });

        services.AddPayments(configuration);
        services.AddScoped<PaymentConfigurationStore>();
        services.AddSocial(configuration);

        return services;
    }

    // Registers social publishing (Facebook Page auto-post). All secrets are
    // bound from the "Social" configuration section (environment variables in
    // production). The Graph API is reached through a typed HttpClient. When no
    // Page token is configured the publisher reports NotConfigured and the admin
    // falls back to manual sharing — the feature is additive and never blocks.
    public static IServiceCollection AddSocial(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SocialOptions>(configuration.GetSection(SocialOptions.SectionName));

        // The Graph API version is part of each request path ("{version}/{pageId}/feed"),
        // so the base address is just the Graph host.
        services.AddHttpClient<FacebookPublisher>(client =>
        {
            client.BaseAddress = new Uri("https://graph.facebook.com/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddHttpClient<WhatsAppSender>(client =>
        {
            client.BaseAddress = new Uri("https://graph.facebook.com/");
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        return services;
    }

    // Registers the real payment providers behind the shared abstraction. All
    // secrets are bound from the "Payments" configuration section (environment
    // variables in production). Flouci talks to its REST API via a typed
    // HttpClient; Stripe uses the official Stripe.net SDK. The selector routes a
    // checkout by country and OrderPaymentService is the shared "mark paid +
    // decrement stock" logic reused by webhooks and the admin manual gateway.
    public static IServiceCollection AddPayments(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PaymentOptions>(configuration.GetSection(PaymentOptions.SectionName));

        var flouciBaseUrl = configuration[$"{PaymentOptions.SectionName}:{nameof(PaymentOptions.Flouci)}:{nameof(FlouciOptions.BaseUrl)}"];
        services.AddHttpClient<FlouciPaymentProvider>(client =>
        {
            client.BaseAddress = new Uri(string.IsNullOrWhiteSpace(flouciBaseUrl)
                ? "https://developers.flouci.com/"
                : flouciBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<StripePaymentProvider>();
        services.AddScoped<PaymeePaymentProvider>();
        services.AddScoped<PaymentProviderSelector>();
        services.AddScoped<OrderPaymentService>();

        // Generic payment completion: one IPayableCompletion per payable type
        // (shop order = OrderPaymentService, ticket order, supporter brick) plus
        // the router that dispatches by PayableType. The webhooks use the router
        // as their single, uniform completion entry point.
        services.AddScoped<TicketOrderCompletion>();
        services.AddScoped<SupporterBrickCompletion>();
        services.AddScoped<DonationCompletion>();
        services.AddScoped<MembershipCompletion>();
        services.AddScoped<MatchStreamAccessCompletion>();
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<OrderPaymentService>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<TicketOrderCompletion>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<SupporterBrickCompletion>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<DonationCompletion>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<MembershipCompletion>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<MatchStreamAccessCompletion>());
        services.AddScoped<PayableCompletionRouter>();

        return services;
    }
}