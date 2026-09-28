using JSO.Infrastructure.Payments;
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
                    options.UseNpgsql(cs);
                    break;
                case "sqlserver":
                    options.UseSqlServer(cs);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported database provider '{provider}'. Use 'sqlserver' or 'postgres'.");
            }
        });

        services.AddPayments(configuration);

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
        services.AddScoped<PaymentProviderSelector>();
        services.AddScoped<OrderPaymentService>();

        // Generic payment completion: one IPayableCompletion per payable type
        // (shop order = OrderPaymentService, ticket order, supporter brick) plus
        // the router that dispatches by PayableType. The webhooks use the router
        // as their single, uniform completion entry point.
        services.AddScoped<TicketOrderCompletion>();
        services.AddScoped<SupporterBrickCompletion>();
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<OrderPaymentService>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<TicketOrderCompletion>());
        services.AddScoped<IPayableCompletion>(sp => sp.GetRequiredService<SupporterBrickCompletion>());
        services.AddScoped<PayableCompletionRouter>();

        return services;
    }
}
