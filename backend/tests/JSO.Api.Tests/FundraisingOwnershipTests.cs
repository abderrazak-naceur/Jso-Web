using System.Reflection;
using System.Security.Claims;
using System.Text.Json;
using JSO.Api.Controllers;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Tests;

public sealed class FundraisingOwnershipTests
{
    private const string Token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    [Fact]
    public void Claim_endpoint_requires_authenticated_fan_role()
    {
        var method = typeof(FundraisingController).GetMethod(nameof(FundraisingController.Claim))!;
        Assert.Equal("Fan", Assert.Single(method.GetCustomAttributes<AuthorizeAttribute>()).Roles);
        Assert.False(method.IsDefined(typeof(AllowAnonymousAttribute)));
    }

    [Fact]
    public async Task Guest_support_is_claimed_by_authenticated_fan_with_secret_and_all_installments_follow()
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db);
        var fanId = Guid.NewGuid();
        var controller = Controller(db, fanId, Token);

        var response = Assert.IsType<OkObjectResult>(await controller.Claim(commitment.Id, default));

        Assert.Equal(fanId, (await db.FundraisingCommitments.SingleAsync()).FanUserId);
        Assert.All(await db.SupporterBricks.ToListAsync(), installment =>
        {
            Assert.Equal(fanId, installment.FanUserId);
            Assert.Equal("Pending", installment.PaymentStatus);
            Assert.Null(installment.PaidAt);
        });
        Assert.Equal(10, await db.SupporterBricks.CountAsync());
        var body = JsonSerializer.SerializeToElement(response.Value);
        Assert.True(body.GetProperty("claimed").GetBoolean());
        Assert.False(body.TryGetProperty("Email", out _));
        Assert.False(body.TryGetProperty("Phone", out _));
        Assert.False(body.TryGetProperty("AccessTokenHash", out _));
        var mine = Assert.IsType<List<object>>(Assert.IsType<OkObjectResult>(await controller.Mine(default)).Value);
        Assert.Single(mine);
        Assert.IsType<OkObjectResult>(await Controller(db, fanId).Commitment(commitment.Id, default));
    }

    [Fact]
    public async Task Repeating_claim_with_same_fan_is_idempotent()
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db);
        var controller = Controller(db, Guid.NewGuid(), Token);

        Assert.IsType<OkObjectResult>(await controller.Claim(commitment.Id, default));
        Assert.IsType<OkObjectResult>(await controller.Claim(commitment.Id, default));

        Assert.Single(await db.FundraisingCommitments.ToListAsync());
        Assert.Equal(10, await db.SupporterBricks.CountAsync());
        Assert.Equal(1, await db.AuditLogs.CountAsync(log => log.Action == "FUNDRAISING_COMMITMENT_CLAIMED"));
    }

    [Fact]
    public async Task Claim_preserves_recorded_payments_and_never_assigns_another_supporters_installments()
    {
        await using var db = Memory();
        var target = await GuestCommitment(db);
        var unrelated = await GuestCommitment(db);
        var paid = await db.SupporterBricks.FirstAsync(b => b.FundraisingCommitmentId == target.Id);
        var paidAt = DateTimeOffset.UtcNow.AddDays(-2);
        paid.PaymentStatus = "Paid";
        paid.PaidAt = paidAt;
        paid.ProviderRef = "JSO-CASH-OWNERSHIP-TEST";
        await db.SaveChangesAsync();

        Assert.IsType<OkObjectResult>(await Controller(db, Guid.NewGuid(), Token).Claim(target.Id, default));

        Assert.Equal("Paid", paid.PaymentStatus);
        Assert.Equal(paidAt, paid.PaidAt);
        Assert.Equal("JSO-CASH-OWNERSHIP-TEST", paid.ProviderRef);
        Assert.Equal(20m, paid.Amount);
        Assert.Null(unrelated.FanUserId);
        Assert.All(await db.SupporterBricks.Where(b => b.FundraisingCommitmentId == unrelated.Id).ToListAsync(),
            installment => Assert.Null(installment.FanUserId));
    }

    [Fact]
    public async Task Another_fan_cannot_take_an_owned_commitment_even_with_the_original_guest_secret()
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db);
        var ownerId = Guid.NewGuid();
        await Controller(db, ownerId, Token).Claim(commitment.Id, default);

        Assert.IsType<ConflictResult>(await Controller(db, Guid.NewGuid(), Token).Claim(commitment.Id, default));

        Assert.Equal(ownerId, commitment.FanUserId);
        Assert.All(await db.SupporterBricks.ToListAsync(), installment => Assert.Equal(ownerId, installment.FanUserId));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("short")]
    [InlineData("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")]
    public async Task Missing_or_wrong_token_cannot_claim_even_when_account_email_matches(string? token)
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db);
        var controller = Controller(db, Guid.NewGuid(), token);
        ((ClaimsIdentity)controller.User.Identity!).AddClaim(new Claim(ClaimTypes.Email, commitment.Email!));

        Assert.IsType<UnauthorizedResult>(await controller.Claim(commitment.Id, default));

        Assert.Null(commitment.FanUserId);
        Assert.All(await db.SupporterBricks.ToListAsync(), installment => Assert.Null(installment.FanUserId));
    }

    [Fact]
    public async Task Secret_does_not_allow_unauthenticated_or_non_fan_claim()
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db);
        var controller = Controller(db, token: Token);

        Assert.IsType<UnauthorizedResult>(await controller.Claim(commitment.Id, default));
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", Guid.NewGuid().ToString()), new Claim(ClaimTypes.Role, "ClubAdmin")], "Test"));
        Assert.IsType<UnauthorizedResult>(await controller.Claim(commitment.Id, default));
        Assert.Null(commitment.FanUserId);
    }

    [Fact]
    public async Task Archived_project_stays_private_but_claimed_support_remains_in_owners_dashboard()
    {
        await using var db = Memory();
        var commitment = await GuestCommitment(db, "Archived");
        var fanId = Guid.NewGuid();
        var controller = Controller(db, fanId, Token);

        Assert.IsType<NotFoundResult>(await controller.Project(commitment.ProjectId, default));
        Assert.IsType<NotFoundResult>(await controller.Supporters(commitment.ProjectId));
        Assert.IsType<OkObjectResult>(await controller.Claim(commitment.Id, default));
        var mine = Assert.IsType<List<object>>(Assert.IsType<OkObjectResult>(await Controller(db, fanId).Mine(default)).Value);
        Assert.Single(mine);
        Assert.IsType<OkObjectResult>(await Controller(db, fanId).Commitment(commitment.Id, default));
        Assert.IsType<UnauthorizedResult>(await Controller(db, Guid.NewGuid()).Commitment(commitment.Id, default));
        Assert.Empty(Assert.IsType<List<object>>(Assert.IsType<OkObjectResult>(await Controller(db, Guid.NewGuid()).Mine(default)).Value));
    }

    [Fact]
    public async Task Unknown_commitment_returns_not_found_without_creating_records()
    {
        await using var db = Memory();
        Assert.IsType<NotFoundResult>(await Controller(db, Guid.NewGuid(), Token).Claim(Guid.NewGuid(), default));
        Assert.Empty(await db.FundraisingCommitments.ToListAsync());
        Assert.Empty(await db.SupporterBricks.ToListAsync());
    }

    private static JsoDbContext Memory() => new(new DbContextOptionsBuilder<JsoDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static FundraisingController Controller(JsoDbContext db, Guid? fanId = null, string? token = null)
    {
        var context = new DefaultHttpContext();
        if (fanId is { } id)
            context.User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.Role, "Fan"), new Claim("sub", id.ToString())], "Test"));
        if (token is not null) context.Request.Headers["X-Fundraising-Token"] = token;
        return new FundraisingController(db, new AuditService(db))
        {
            ControllerContext = new ControllerContext { HttpContext = context }
        };
    }

    private static async Task<FundraisingCommitment> GuestCommitment(JsoDbContext db, string projectStatus = "Published")
    {
        var project = new FundraisingProject { Title = "Transport JSO", Description = "Bus", BudgetTnd = 30000m, Status = projectStatus };
        var commitment = new FundraisingCommitment
        {
            ProjectId = project.Id, DisplayName = "Supporter invité", Email = "guest@example.test", Phone = "+21620123456",
            MonthlyAmountTnd = 20m, Months = 10, PaymentMethod = "Cash", AccessTokenHash = FundraisingAccess.HashToken(Token)
        };
        db.FundraisingProjects.Add(project);
        db.FundraisingCommitments.Add(commitment);
        db.SupporterBricks.AddRange(FundraisingRules.CreateInstallments(commitment));
        await db.SaveChangesAsync();
        return commitment;
    }
}
