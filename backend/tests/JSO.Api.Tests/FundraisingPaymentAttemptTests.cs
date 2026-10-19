using System.Net;
using System.Text.Json;
using JSO.Api.Controllers;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JSO.Api.Tests;

public sealed class FundraisingPaymentAttemptTests
{
    private const string Token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    [Fact]
    public async Task Provider_failure_keeps_the_attempt_persisted_before_remote_call_and_blocks_admin_deletion()
    {
        var options = DatabaseOptions();
        await using var db = new JsoDbContext(options);
        var (commitment, installment) = await Seed(db);
        var observedBeforeRemoteResponse = false;
        using var handler = new CallbackHandler(async (request, ct) =>
        {
            // A fresh DbContext proves these values were saved before the HTTP
            // request, rather than existing only in the checkout change tracker.
            await using var observer = new JsoDbContext(options);
            var persisted = await observer.SupporterBricks.AsNoTracking().SingleAsync(b => b.Id == installment.Id, ct);
            Assert.Equal("Flouci", persisted.PaymentProvider);
            Assert.Equal("TN", persisted.Country);
            Assert.Equal("Pending", persisted.PaymentStatus);
            Assert.Null(persisted.ProviderRef);
            Assert.Null(persisted.PaidAt);
            var audit = Assert.Single(await observer.AuditLogs.AsNoTracking()
                .Where(log => log.Action == "FUNDRAISING_PAYMENT_ATTEMPT").ToListAsync(ct));
            Assert.Equal(installment.Id.ToString(), audit.EntityId);
            Assert.Equal("SupporterBrick", audit.EntityType);
            var details = JsonSerializer.Deserialize<JsonElement>(audit.Details!);
            Assert.Equal("Flouci", details.GetProperty("provider").GetString());
            Assert.Equal("TN", details.GetProperty("country").GetString());

            var admin = Context(new AdminFundraisingController(observer, new AuditService(observer)));
            Assert.IsType<ConflictObjectResult>(await admin.DeleteCommitment(commitment.ProjectId, commitment.Id, ct));
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.EndsWith("/api/generate_payment", request.RequestUri!.AbsolutePath);
            var body = JsonSerializer.Deserialize<JsonElement>(await request.Content!.ReadAsStringAsync(ct));
            Assert.Equal("20000", body.GetProperty("amount").GetString());
            observedBeforeRemoteResponse = true;
            // The real Flouci provider turns a non-success HTTP response into
            // PaymentProviderException, handled as 502 by DonationsController.
            return new HttpResponseMessage(HttpStatusCode.BadGateway);
        });
        using var http = new HttpClient(handler) { BaseAddress = new Uri("https://payments.example.test/") };
        var api = Checkout(db, http, configured: true);

        var result = Assert.IsType<ObjectResult>(await api.Pay(installment.Id, new PayDonationRequest("TN", "FLOUCI"), default));

        Assert.Equal(StatusCodes.Status502BadGateway, result.StatusCode);
        Assert.True(observedBeforeRemoteResponse);
        Assert.Equal(1, handler.Calls);
        await using var after = new JsoDbContext(options);
        var retained = await after.SupporterBricks.AsNoTracking().SingleAsync(b => b.Id == installment.Id);
        Assert.Equal("Flouci", retained.PaymentProvider);
        Assert.Equal("TN", retained.Country);
        Assert.Equal("Pending", retained.PaymentStatus);
        Assert.Null(retained.ProviderRef);
        Assert.Null(retained.ChargedAmount);
        Assert.Null(retained.PaidAt);
        Assert.Equal(1, await after.AuditLogs.CountAsync(log => log.Action == "FUNDRAISING_PAYMENT_ATTEMPT"));
        Assert.Equal(0, await after.AuditLogs.CountAsync(log => log.Action == "DONATION_PAYMENT_INIT"));
        var adminAfterFailure = Context(new AdminFundraisingController(after, new AuditService(after)));
        Assert.IsType<ConflictObjectResult>(await adminAfterFailure.DeleteCommitment(commitment.ProjectId, commitment.Id, default));
        Assert.Equal(10, await after.SupporterBricks.CountAsync());
        Assert.Single(await after.FundraisingCommitments.ToListAsync());
    }

    [Fact]
    public async Task Unconfigured_fallback_provider_never_creates_attempt_or_payment_marker()
    {
        var options = DatabaseOptions();
        await using var db = new JsoDbContext(options);
        var (commitment, installment) = await Seed(db);
        using var handler = new CallbackHandler((_, _) => throw new InvalidOperationException("An unavailable provider must not be called."));
        using var http = new HttpClient(handler) { BaseAddress = new Uri("https://payments.example.test/") };
        var api = Checkout(db, http, configured: false);

        // No explicit provider: Tunisia falls back to Flouci because Konnect
        // has no active configuration. Flouci is also unconfigured.
        var result = Assert.IsType<ObjectResult>(await api.Pay(installment.Id, new PayDonationRequest("TN"), default));

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, result.StatusCode);
        Assert.Equal(0, handler.Calls);
        await using var observer = new JsoDbContext(options);
        var persisted = await observer.SupporterBricks.AsNoTracking().SingleAsync(b => b.Id == installment.Id);
        Assert.Null(persisted.PaymentProvider);
        Assert.Null(persisted.Country);
        Assert.Null(persisted.ProviderRef);
        Assert.Null(persisted.PaidAt);
        Assert.Equal("Pending", persisted.PaymentStatus);
        Assert.Empty(await observer.AuditLogs.ToListAsync());
        var admin = Context(new AdminFundraisingController(observer, new AuditService(observer)));
        Assert.IsType<NoContentResult>(await admin.DeleteCommitment(commitment.ProjectId, commitment.Id, default));
    }

    private static DonationsController Checkout(JsoDbContext db, HttpClient http, bool configured)
    {
        var environment = new TestEnvironment();
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Payments:PublicBaseUrl"] = "https://jso.example.test",
            ["Jwt:Key"] = new string('k', 32)
        }).Build();
        var paymentOptions = Options.Create(new PaymentOptions
        {
            Flouci = new FlouciOptions
            {
                AppToken = configured ? "test-app-token" : "",
                AppSecret = configured ? "test-app-secret" : "",
                WebhookSecret = configured ? "test-webhook-secret" : ""
            }
        });
        var store = new PaymentConfigurationStore(db, configuration);
        var selector = new PaymentProviderSelector(
            new FlouciPaymentProvider(http, paymentOptions, NullLogger<FlouciPaymentProvider>.Instance, environment),
            new StripePaymentProvider(paymentOptions, NullLogger<StripePaymentProvider>.Instance),
            new KonnectPaymentProvider(null!, store, NullLogger<KonnectPaymentProvider>.Instance),
            new PaymeePaymentProvider(null!, store, NullLogger<PaymeePaymentProvider>.Instance));
        var api = Context(new DonationsController(db, new AuditService(db), selector, new PaymentLinkBuilder(configuration, environment)));
        api.Request.Headers["X-Fundraising-Token"] = Token;
        return api;
    }

    private static DbContextOptions<JsoDbContext> DatabaseOptions() => new DbContextOptionsBuilder<JsoDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;

    private static async Task<(FundraisingCommitment Commitment, SupporterBrick Installment)> Seed(JsoDbContext db)
    {
        var project = new FundraisingProject { Title = "Transport JSO", Description = "Bus", BudgetTnd = 30000m, Status = "Published" };
        var commitment = new FundraisingCommitment
        {
            ProjectId = project.Id, DisplayName = "Supporter Test", MonthlyAmountTnd = 20m,
            PaymentMethod = "Online", AccessTokenHash = FundraisingAccess.HashToken(Token)
        };
        var installments = FundraisingRules.CreateInstallments(commitment);
        db.FundraisingProjects.Add(project);
        db.FundraisingCommitments.Add(commitment);
        db.SupporterBricks.AddRange(installments);
        await db.SaveChangesAsync();
        return (commitment, installments[0]);
    }

    private static T Context<T>(T controller) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private sealed class CallbackHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> callback) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            return callback(request, cancellationToken);
        }
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "JSO.Tests";
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
