using System.Reflection;
using JSO.Api.Controllers;
using JSO.Domain;
using Microsoft.AspNetCore.Authorization;

namespace JSO.Api.Tests;

public sealed class FundraisingTests
{
    public static TheoryData<decimal> MonthlyPlans => new() { 5m, 10m, 20m, 30m, 50m };

    [Theory]
    [MemberData(nameof(MonthlyPlans))]
    public void Monthly_plan_creates_ten_distinct_unpaid_installments_for_the_selected_amount(decimal monthlyAmount)
    {
        var commitment = Commitment(monthlyAmount);

        var installments = FundraisingRules.CreateInstallments(commitment);

        Assert.Equal(10, installments.Count);
        Assert.Equal(Enumerable.Range(1, 10), installments.Select(b => b.InstallmentNumber!.Value));
        Assert.Equal(10, installments.Select(b => b.Id).Distinct().Count());
        Assert.Equal(monthlyAmount * 10m, installments.Sum(b => b.Amount));
        Assert.All(installments, installment =>
        {
            Assert.Equal(monthlyAmount, installment.Amount);
            Assert.Equal(commitment.ProjectId, installment.FundraisingProjectId);
            Assert.Equal(commitment.Id, installment.FundraisingCommitmentId);
            Assert.Equal(commitment.FanUserId, installment.FanUserId);
            Assert.Equal(commitment.DisplayName, installment.DisplayName);
            Assert.Equal(commitment.Phone, installment.DonorPhone);
            Assert.Equal("Pending", installment.PaymentStatus);
            Assert.Null(installment.PaidAt);
            Assert.Null(installment.ProviderRef);
            Assert.Null(installment.ChargedAmount);
        });
    }

    [Theory]
    [InlineData("Cash", "Cash", "TN")]
    [InlineData("Online", null, null)]
    public void Creating_a_commitment_never_confirms_a_payment_or_claims_an_online_provider(
        string paymentMethod, string? provider, string? country)
    {
        var commitment = Commitment(20m);
        commitment.PaymentMethod = paymentMethod;
        commitment.FanUserId = null;

        Assert.All(FundraisingRules.CreateInstallments(commitment), installment =>
        {
            Assert.Equal("Pending", installment.PaymentStatus);
            Assert.Null(installment.PaidAt);
            Assert.Equal(provider, installment.PaymentProvider);
            Assert.Equal(country, installment.Country);
            Assert.Null(installment.FanUserId);
        });
    }

    public static TheoryData<decimal, int> InvalidPlans => new()
    {
        { 0m, 10 }, { -5m, 10 }, { 15m, 10 }, { 5.5m, 10 }, { 100m, 10 },
        { 5m, 0 }, { 5m, 1 }, { 5m, 9 }, { 5m, 11 }, { 5m, -10 }
    };

    [Theory]
    [MemberData(nameof(InvalidPlans))]
    public void Invalid_amount_or_duration_cannot_create_installments(decimal amount, int months)
    {
        var commitment = Commitment(amount);
        commitment.Months = months;

        Assert.Throws<ArgumentException>(() => FundraisingRules.CreateInstallments(commitment));
    }

    [Theory]
    [InlineData("Draft")]
    [InlineData("Published")]
    [InlineData("Archived")]
    public void Valid_project_can_be_saved_as_draft_or_published(string status)
    {
        var project = Project();
        project.Status = status;

        Assert.Null(FundraisingRules.ValidateProject(project));
    }

    [Fact]
    public void Project_validation_accepts_budget_and_text_boundaries()
    {
        var project = Project();
        project.Title = new string('T', 160);
        project.Description = new string('D', 6000);
        project.BudgetTnd = 1m;
        Assert.Null(FundraisingRules.ValidateProject(project));

        project.BudgetTnd = 10_000_000m;
        Assert.Null(FundraisingRules.ValidateProject(project));
    }

    [Fact]
    public void Project_validation_rejects_invalid_fields()
    {
        Action<FundraisingProject>[] invalidChanges =
        [
            p => p.Title = " ", p => p.Title = new string('T', 161),
            p => p.Description = "", p => p.Description = new string('D', 6001),
            p => p.BudgetTnd = 0m, p => p.BudgetTnd = 10_000_001m,
            p => p.DurationMonths = 9, p => p.DurationMonths = 11,
            p => p.TemplateId = "missing", p => p.Status = "Unknown"
        ];

        foreach (var change in invalidChanges)
        {
            var project = Project();
            change(project);
            Assert.NotNull(FundraisingRules.ValidateProject(project));
        }
    }

    [Fact]
    public void Admin_project_and_contribution_management_requires_finance_roles()
    {
        var controller = typeof(AdminFundraisingController);
        var authorization = Assert.Single(controller.GetCustomAttributes<AuthorizeAttribute>());
        var roles = authorization.Roles!.Split(',').Order().ToArray();

        Assert.Equal(new[] { "ClubAdmin", "FinanceManager", "SuperAdmin" }, roles);
        Assert.DoesNotContain(controller.GetMethods(), method => method.IsDefined(typeof(AllowAnonymousAttribute)));
    }

    [Fact]
    public void Personal_commitments_endpoint_requires_authenticated_fan_role()
    {
        var method = typeof(FundraisingController).GetMethod(nameof(FundraisingController.Mine))!;
        var authorization = Assert.Single(method.GetCustomAttributes<AuthorizeAttribute>());

        Assert.Equal("Fan", authorization.Roles);
        Assert.False(method.IsDefined(typeof(AllowAnonymousAttribute)));
    }

    [Fact]
    public void Access_token_matches_only_its_own_hash()
    {
        var token = new string('A', 43);
        var hash = FundraisingAccess.HashToken(token);

        Assert.Equal(64, hash.Length);
        Assert.True(FundraisingAccess.Matches(hash, token));
        Assert.False(FundraisingAccess.Matches(hash, new string('B', 43)));
        Assert.False(FundraisingAccess.Matches(hash, token[..42] + "B"));
        Assert.False(FundraisingAccess.Matches(hash, hash));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(42)]
    [InlineData(44)]
    [InlineData(64)]
    public void Access_token_rejects_malformed_lengths(int length)
    {
        var hash = FundraisingAccess.HashToken(new string('A', 43));

        Assert.False(FundraisingAccess.Matches(hash, new string('A', length)));
    }

    [Fact]
    public void Access_token_rejects_malformed_values_or_stored_hashes()
    {
        var token = new string('A', 43);
        var hash = FundraisingAccess.HashToken(token);

        Assert.False(FundraisingAccess.Matches(hash, new string('$', 43)));
        Assert.False(FundraisingAccess.Matches("", token));
        Assert.False(FundraisingAccess.Matches("not-a-sha256-hash", token));
        Assert.False(FundraisingAccess.Matches(new string('0', 64), token));
    }

    private static FundraisingCommitment Commitment(decimal monthlyAmount) => new()
    {
        ProjectId = Guid.NewGuid(), FanUserId = Guid.NewGuid(), DisplayName = "Supporter Test",
        Phone = "+21620123456", MonthlyAmountTnd = monthlyAmount, Months = 10,
        PaymentMethod = "Cash", CreatedAt = new DateTimeOffset(2026, 10, 19, 12, 0, 0, TimeSpan.Zero)
    };

    private static FundraisingProject Project() => new()
    {
        Title = "Un bus pour la JSO", Description = "Améliorer les déplacements de notre équipe.",
        BudgetTnd = 30_000m, DurationMonths = 10, TemplateId = "bus", Status = "Draft"
    };
}
