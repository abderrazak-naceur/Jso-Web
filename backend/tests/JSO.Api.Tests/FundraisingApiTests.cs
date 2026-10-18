using System.Security.Claims;
using System.Text.Json;
using JSO.Api.Controllers;
using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace JSO.Api.Tests;

public sealed class FundraisingApiTests
{
    private const string Token = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

    [Fact]
    public void Postgres_snapshot_matches_current_model_before_migration()
    {
        using var db = Postgres();
        var snapshot = db.GetService<IMigrationsAssembly>().ModelSnapshot!.Model;
        var initializedSnapshot = db.GetService<IModelRuntimeInitializer>().Initialize(snapshot, designTime: true);
        var current = db.GetService<IDesignTimeModel>().Model;
        var changes = db.GetService<IMigrationsModelDiffer>().GetDifferences(initializedSnapshot.GetRelationalModel(), current.GetRelationalModel());
        var details = changes.Select(operation => operation switch
        {
            ColumnOperation column => $"{operation.GetType().Name}: {column.Table}.{column.Name} {column.ColumnType} nullable={column.IsNullable} default={column.DefaultValue}",
            DropColumnOperation column => $"DropColumn: {column.Table}.{column.Name}",
            CreateIndexOperation index => $"CreateIndex: {index.Table}.{index.Name} ({string.Join(',', index.Columns)})",
            DropIndexOperation index => $"DropIndex: {index.Table}.{index.Name}",
            AddForeignKeyOperation key => $"AddForeignKey: {key.Table}.{key.Name}",
            DropForeignKeyOperation key => $"DropForeignKey: {key.Table}.{key.Name}",
            CreateTableOperation table => $"CreateTable: {table.Name}",
            DropTableOperation table => $"DropTable: {table.Name}",
            _ => operation.GetType().Name
        });
        Assert.False(db.Database.HasPendingModelChanges(), string.Join(Environment.NewLine, details));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Public_project_queries_translate_to_postgres_sql_without_connecting(bool filterId)
    {
        using var db = Postgres();

        var sql = FundraisingQueries.Projects(db, filterId ? Guid.NewGuid() : null, publishedOnly: true).ToQueryString();

        Assert.Contains("SELECT", sql);
        Assert.Contains("Published", sql);
        Assert.Contains("FundraisingProjects", sql);
        Assert.Contains("FundraisingCommitments", sql);
        Assert.Contains("SupporterBricks", sql);
        Assert.Contains("Paid", sql);
    }

    [Fact]
    public void Fundraising_migration_generates_postgres_tables_indexes_and_restrict_foreign_keys()
    {
        using var db = Postgres();

        var sql = db.GetService<IMigrator>().GenerateScript(
            "20261015080000_AddPasswordResetTokens", "20261019090000_AddFundraisingProjects");

        Assert.Contains("CREATE TABLE \"FundraisingProjects\"", sql);
        Assert.Contains("CREATE TABLE \"FundraisingCommitments\"", sql);
        Assert.Contains("numeric(14,2)", sql);
        Assert.Contains("CREATE UNIQUE INDEX \"IX_SupporterBricks_FundraisingCommitmentId_InstallmentNumber\"", sql);
        Assert.Contains("CONSTRAINT \"FK_SupporterBricks_FundraisingCommitment\"", sql);
        Assert.Contains("ON DELETE RESTRICT", sql);
        Assert.DoesNotContain("INSERT INTO \"FundraisingProjects\"", sql);
    }

    [Fact]
    public async Task Admin_can_save_draft_and_publish_it_while_public_endpoints_hide_drafts()
    {
        await using var db = Memory();
        var admin = Context(new AdminFundraisingController(db, new AuditService(db)));
        var publicApi = Public(db);
        var draftRequest = new EditFundraisingProject("Un bus pour la JSO", "Transport de l’équipe", 30000m);

        var created = Assert.IsType<OkObjectResult>(await admin.Create(draftRequest, default));
        var draft = Assert.IsType<FundraisingProjectView>(created.Value);
        Assert.Equal("Draft", draft.Status);
        Assert.Empty(Assert.IsType<List<FundraisingProjectView>>(Assert.IsType<OkObjectResult>(await publicApi.Projects(default)).Value));
        Assert.IsType<NotFoundResult>(await publicApi.Project(draft.Id, default));
        Assert.IsType<NotFoundResult>(await publicApi.Supporters(draft.Id));
        Assert.IsType<NotFoundResult>(await publicApi.Join(draft.Id, Request(), default));

        Assert.IsType<OkObjectResult>(await admin.Update(draft.Id, draftRequest with { Status = "Published" }, default));

        var visible = Assert.IsType<FundraisingProjectView>(Assert.IsType<OkObjectResult>(await publicApi.Project(draft.Id, default)).Value);
        Assert.Equal("Published", visible.Status);
        Assert.Equal(30000m, visible.BudgetTnd);
        Assert.Equal(0m, visible.TotalPaidTnd);
        Assert.Equal(0, visible.SupporterCount);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(20)]
    [InlineData(30)]
    [InlineData(50)]
    public async Task Joining_creates_one_commitment_ten_unpaid_real_amount_installments_and_is_retry_safe(int amount)
    {
        await using var db = Memory();
        var project = await Published(db);
        var api = Public(db);
        var request = Request() with { MonthlyAmountTnd = amount };

        Assert.IsType<CreatedResult>(await api.Join(project.Id, request, default));
        Assert.IsType<OkObjectResult>(await api.Join(project.Id, request, default));

        var commitment = Assert.Single(await db.FundraisingCommitments.ToListAsync());
        var installments = await db.SupporterBricks.OrderBy(b => b.InstallmentNumber).ToListAsync();
        Assert.Equal(request.ClientRequestId, commitment.Id);
        Assert.Equal(amount, commitment.MonthlyAmountTnd);
        Assert.Equal(10, installments.Count);
        Assert.Equal(amount * 10m, installments.Sum(b => b.Amount));
        Assert.All(installments, b => { Assert.Equal("Pending", b.PaymentStatus); Assert.Null(b.PaidAt); });
        Assert.Equal(Enumerable.Range(1, 10), installments.Select(b => b.InstallmentNumber!.Value));

        var summary = await FundraisingQueries.Projects(db, project.Id, true).SingleAsync();
        Assert.Equal(1, summary.SupporterCount);
        Assert.Equal(0m, summary.TotalPaidTnd);
        Assert.Equal(0, summary.PaidSupporterCount);
    }

    [Fact]
    public async Task Invalid_join_never_persists_a_commitment_or_partial_installments()
    {
        await using var db = Memory();
        var project = await Published(db);
        var api = Public(db);

        Assert.IsType<BadRequestObjectResult>(await api.Join(project.Id, Request() with { MonthlyAmountTnd = 15m }, default));
        Assert.Empty(await db.FundraisingCommitments.ToListAsync());
        Assert.Empty(await db.SupporterBricks.ToListAsync());
    }

    [Fact]
    public async Task Admin_cash_confirmation_counts_only_the_received_installment_and_exposes_no_public_contact_details()
    {
        await using var db = Memory();
        var project = await Published(db);
        var api = Public(db);
        await api.Join(project.Id, Request(), default);
        var first = await db.SupporterBricks.OrderBy(b => b.InstallmentNumber).FirstAsync();
        var admin = Context(new AdminDonationsController(db, new AuditService(db), null!, null!, null!, null!));

        Assert.IsType<OkObjectResult>(await admin.ConfirmCash(first.Id, default));
        Assert.IsType<BadRequestObjectResult>(await admin.ConfirmCash(first.Id, default));

        var summary = await FundraisingQueries.Projects(db, project.Id, true).SingleAsync();
        Assert.Equal(1, summary.SupporterCount);
        Assert.Equal(1, summary.PaidSupporterCount);
        Assert.Equal(1, summary.PaidInstallmentCount);
        Assert.Equal(20m, summary.TotalPaidTnd);
        Assert.Equal(9, await db.SupporterBricks.CountAsync(b => b.PaymentStatus == "Pending"));
        Assert.NotNull(first.PaidAt);
        var supporters = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await api.Supporters(project.Id)).Value);
        Assert.Equal(1, supporters.GetProperty("totalCount").GetInt32());
        var supporter = Assert.Single(supporters.GetProperty("items").EnumerateArray());
        Assert.Equal("Supporter Test", supporter.GetProperty("DisplayName").GetString());
        Assert.False(supporter.TryGetProperty("Phone", out _));
        Assert.False(supporter.TryGetProperty("Email", out _));
        Assert.False(supporter.TryGetProperty("AccessTokenHash", out _));
    }

    [Fact]
    public async Task Online_supporter_is_not_public_before_real_payment_confirmation()
    {
        await using var db = Memory();
        var project = await Published(db);
        var api = Public(db);
        await api.Join(project.Id, Request() with { PaymentMethod = "Online" }, default);

        var summary = await FundraisingQueries.Projects(db, project.Id, true).SingleAsync();
        Assert.Equal(0, summary.SupporterCount);
        Assert.Equal(0m, summary.TotalPaidTnd);
        var supporters = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await api.Supporters(project.Id)).Value);
        Assert.Equal(0, supporters.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Guest_commitment_is_private_and_requires_its_own_token()
    {
        await using var db = Memory();
        var project = await Published(db);
        var api = Public(db);
        var request = Request();
        await api.Join(project.Id, request, default);

        Assert.IsType<UnauthorizedResult>(await api.Commitment(request.ClientRequestId, default));
        api.Request.Headers["X-Fundraising-Token"] = new string('X', 43);
        Assert.IsType<UnauthorizedResult>(await api.Commitment(request.ClientRequestId, default));
        api.Request.Headers["X-Fundraising-Token"] = Token;
        Assert.IsType<OkObjectResult>(await api.Commitment(request.ClientRequestId, default));
    }

    [Fact]
    public async Task Fan_can_read_own_commitment_without_guest_token_but_other_fans_cannot()
    {
        await using var db = Memory();
        var project = await Published(db);
        var fanId = Guid.NewGuid();
        var api = Public(db);
        Fan(api, fanId);
        var request = Request();
        await api.Join(project.Id, request, default);
        Assert.Equal(fanId, (await db.FundraisingCommitments.SingleAsync()).FanUserId);
        Assert.IsType<OkObjectResult>(await api.Commitment(request.ClientRequestId, default));

        Fan(api, Guid.NewGuid());
        Assert.IsType<UnauthorizedResult>(await api.Commitment(request.ClientRequestId, default));
    }

    [Fact]
    public async Task Installment_checkout_rejects_non_owner_and_does_not_convert_cash_promises_to_online_payments()
    {
        await using var db = Memory();
        var project = await Published(db);
        await Public(db).Join(project.Id, Request(), default);
        var installment = await db.SupporterBricks.FirstAsync();
        var api = Context(new DonationsController(db, new AuditService(db), null!, null!));

        Assert.IsType<UnauthorizedResult>(await api.Pay(installment.Id, new PayDonationRequest("TN"), default));
        api.Request.Headers["X-Fundraising-Token"] = Token;
        Assert.IsType<BadRequestObjectResult>(await api.Pay(installment.Id, new PayDonationRequest("TN"), default));
        Assert.Equal("Cash", installment.PaymentProvider);
        Assert.Equal("Pending", installment.PaymentStatus);
        Assert.Null(installment.ProviderRef);
    }

    private static JsoDbContext Postgres() => new(new DbContextOptionsBuilder<JsoDbContext>()
        .UseNpgsql("Host=localhost;Database=test;Username=test;Password=test").Options);

    private static JsoDbContext Memory() => new(new DbContextOptionsBuilder<JsoDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static FundraisingController Public(JsoDbContext db) => Context(new FundraisingController(db, new AuditService(db)));

    private static T Context<T>(T controller) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    private static void Fan(ControllerBase controller, Guid id) => controller.HttpContext.User = new ClaimsPrincipal(
        new ClaimsIdentity([new Claim(ClaimTypes.Role, "Fan"), new Claim("sub", id.ToString())], "Test"));

    private static JoinFundraisingRequest Request() => new(Guid.NewGuid(), Token, "Supporter Test", 20m, "Cash", "+21620123456", "supporter@example.test");

    private static async Task<FundraisingProject> Published(JsoDbContext db)
    {
        var project = new FundraisingProject { Title = "Un bus pour la JSO", Description = "Transport", BudgetTnd = 30000m, Status = "Published" };
        db.FundraisingProjects.Add(project);
        await db.SaveChangesAsync();
        return project;
    }
}
