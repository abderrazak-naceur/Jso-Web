using System.Security.Claims;
using JSO.Api.Controllers;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Tests;

public sealed class FundraisingManagementTests
{
    [Fact]
    public async Task Deleting_a_test_project_removes_only_its_unpaid_installments_and_commitments_and_keeps_an_audit_record()
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        var (otherProject, otherCommitment, otherInstallments) = await Seed(db);

        Assert.IsType<NoContentResult>(await Admin(db).Delete(project.Id, default));

        Assert.Equal(otherProject.Id, Assert.Single(await db.FundraisingProjects.ToListAsync()).Id);
        Assert.Equal(otherCommitment.Id, Assert.Single(await db.FundraisingCommitments.ToListAsync()).Id);
        Assert.Equal(otherInstallments.Select(b => b.Id).Order(), (await db.SupporterBricks.Select(b => b.Id).ToListAsync()).Order());
        var audit = Assert.Single(await db.AuditLogs.ToListAsync());
        Assert.Equal("FUNDRAISING_PROJECT_DELETED", audit.Action);
        Assert.Equal(project.Id.ToString(), audit.EntityId);
        Assert.Equal("finance-admin", audit.UserId);
    }

    [Theory]
    [InlineData("paid")]
    [InlineData("paidAt")]
    [InlineData("providerRef")]
    [InlineData("onlineProvider")]
    [InlineData("chargedAmount")]
    [InlineData("chargedCurrency")]
    [InlineData("processing")]
    [InlineData("failed")]
    [InlineData("auditOnly")]
    public async Task Financial_history_blocks_project_and_commitment_deletion_without_removing_any_record(string marker)
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        Mark(installments[0], marker);
        if (marker == "auditOnly") db.AuditLogs.Add(new AuditLog
        {
            Action = "DONATION_PAYMENT_INIT", EntityType = "SupporterBrick", EntityId = installments[0].Id.ToString()
        });
        await db.SaveChangesAsync();

        var api = Admin(db);
        Assert.IsType<ConflictObjectResult>(await api.DeleteCommitment(project.Id, commitment.Id, default));
        Assert.IsType<ConflictObjectResult>(await api.Delete(project.Id, default));

        Assert.Single(await db.FundraisingProjects.ToListAsync());
        Assert.Single(await db.FundraisingCommitments.ToListAsync());
        Assert.Equal(10, await db.SupporterBricks.CountAsync());
        Assert.DoesNotContain(await db.AuditLogs.ToListAsync(), log => log.Action.EndsWith("DELETED"));
    }

    [Fact]
    public async Task An_unpaid_online_plan_with_no_provider_attempt_can_be_deleted()
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        commitment.PaymentMethod = "Online";
        foreach (var installment in installments) installment.PaymentProvider = null;
        await db.SaveChangesAsync();

        Assert.IsType<NoContentResult>(await Admin(db).DeleteCommitment(project.Id, commitment.Id, default));

        Assert.Single(await db.FundraisingProjects.ToListAsync());
        Assert.Empty(await db.FundraisingCommitments.ToListAsync());
        Assert.Empty(await db.SupporterBricks.ToListAsync());
        Assert.Equal("FUNDRAISING_COMMITMENT_DELETED", Assert.Single(await db.AuditLogs.ToListAsync()).Action);
    }

    [Fact]
    public async Task Commitment_routes_are_scoped_to_the_correct_project()
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        var wrongProject = Guid.NewGuid();
        var api = Admin(db);

        Assert.IsType<NotFoundResult>(await api.DeleteCommitment(wrongProject, commitment.Id, default));
        Assert.IsType<NotFoundResult>(await api.UpdateCommitment(wrongProject, commitment.Id, new("Autre nom"), default));

        Assert.Equal("Supporter Test", commitment.DisplayName);
        Assert.Equal(10, await db.SupporterBricks.CountAsync());
        Assert.Empty(await db.AuditLogs.ToListAsync());
    }

    [Fact]
    public async Task Editing_contacts_updates_unpaid_schedule_but_preserves_paid_receipts_and_plan()
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        var paid = installments[0];
        paid.PaymentStatus = "Paid";
        paid.PaidAt = DateTimeOffset.UtcNow;
        paid.ProviderRef = "cash-receipt";
        paid.ChargedAmount = 20m;
        paid.ChargedCurrency = "TND";
        var onlineAttempt = installments[1];
        onlineAttempt.PaymentProvider = "Paymee";
        onlineAttempt.ProviderRef = "checkout-ref";
        await db.SaveChangesAsync();

        Assert.IsType<OkObjectResult>(await Admin(db).UpdateCommitment(project.Id, commitment.Id,
            new(" Nom corrigé ", " +21629999999 ", " updated@example.test "), default));

        Assert.Equal("Nom corrigé", commitment.DisplayName);
        Assert.Equal("+21629999999", commitment.Phone);
        Assert.Equal("updated@example.test", commitment.Email);
        Assert.Equal(20m, commitment.MonthlyAmountTnd);
        Assert.Equal(10, commitment.Months);
        Assert.Equal("Supporter Test", paid.DisplayName);
        Assert.Equal("+21620123456", paid.DonorPhone);
        Assert.Equal("Paid", paid.PaymentStatus);
        Assert.Equal("cash-receipt", paid.ProviderRef);
        Assert.Equal("Supporter Test", onlineAttempt.DisplayName);
        Assert.All(installments.Skip(2), installment =>
        {
            Assert.Equal("Nom corrigé", installment.DisplayName);
            Assert.Equal("+21629999999", installment.DonorPhone);
            Assert.Equal("Pending", installment.PaymentStatus);
            Assert.Equal(20m, installment.Amount);
        });
        Assert.Equal("FUNDRAISING_COMMITMENT_UPDATED", Assert.Single(await db.AuditLogs.ToListAsync()).Action);
    }

    [Theory]
    [InlineData("", null, null)]
    [InlineData("Nom", null, "invalid-email")]
    [InlineData("Nom", "123456789012345678901234567890123", null)]
    public async Task Invalid_contact_changes_are_rejected_before_persisting(string name, string? phone, string? email)
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);

        Assert.IsType<BadRequestObjectResult>(await Admin(db).UpdateCommitment(project.Id, commitment.Id, new(name, phone, email), default));

        Assert.Equal("Supporter Test", commitment.DisplayName);
        Assert.Empty(await db.AuditLogs.ToListAsync());
    }

    [Fact]
    public async Task Archiving_hides_project_publicly_preserves_payment_history_and_can_be_reversed()
    {
        await using var db = Memory();
        var (project, commitment, installments) = await Seed(db);
        installments[0].PaymentStatus = "Paid";
        installments[0].PaidAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        var api = Admin(db);

        Assert.IsType<OkObjectResult>(await api.Archive(project.Id, default));

        Assert.Equal("Archived", project.Status);
        Assert.Empty(await FundraisingQueries.Projects(db, publishedOnly: true).ToListAsync());
        Assert.Single(await db.FundraisingCommitments.ToListAsync());
        Assert.Equal(10, await db.SupporterBricks.CountAsync());
        Assert.Equal(20m, (await FundraisingQueries.Projects(db, project.Id).SingleAsync()).TotalPaidTnd);
        Assert.IsType<OkObjectResult>(await api.Update(project.Id,
            new(project.Title, project.Description, project.BudgetTnd, Status: "Published"), default));
        Assert.Single(await FundraisingQueries.Projects(db, publishedOnly: true).ToListAsync());
        Assert.Equal("Paid", installments[0].PaymentStatus);
    }

    private static void Mark(SupporterBrick installment, string marker)
    {
        switch (marker)
        {
            case "paid": installment.PaymentStatus = "Paid"; break;
            case "paidAt": installment.PaidAt = DateTimeOffset.UtcNow; break;
            case "providerRef": installment.ProviderRef = "provider-session"; break;
            case "onlineProvider": installment.PaymentProvider = "Stripe"; break;
            case "chargedAmount": installment.ChargedAmount = 20m; break;
            case "chargedCurrency": installment.ChargedCurrency = "TND"; break;
            case "processing": installment.PaymentStatus = "Processing"; break;
            case "failed": installment.PaymentStatus = "Failed"; break;
        }
    }

    private static AdminFundraisingController Admin(JsoDbContext db) => new(db, new AuditService(db))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "finance-admin"), new Claim(ClaimTypes.Role, "FinanceManager")], "Test"))
            }
        }
    };

    private static JsoDbContext Memory() => new(new DbContextOptionsBuilder<JsoDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static async Task<(FundraisingProject, FundraisingCommitment, List<SupporterBrick>)> Seed(JsoDbContext db)
    {
        var project = new FundraisingProject { Title = "Un bus pour la JSO", Description = "Transport", BudgetTnd = 30000m, Status = "Published" };
        var commitment = new FundraisingCommitment
        {
            ProjectId = project.Id, DisplayName = "Supporter Test", Phone = "+21620123456", Email = "test@example.test",
            MonthlyAmountTnd = 20m, PaymentMethod = "Cash", Months = 10
        };
        var installments = FundraisingRules.CreateInstallments(commitment);
        db.FundraisingProjects.Add(project);
        db.FundraisingCommitments.Add(commitment);
        db.SupporterBricks.AddRange(installments);
        await db.SaveChangesAsync();
        return (project, commitment, installments);
    }
}
