using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261019090000_AddFundraisingProjects")]
public sealed class AddFundraisingProjects : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.CreateTable(name: "FundraisingProjects", columns: t => new
        {
            Id = t.Column<Guid>(nullable: false), Title = t.Column<string>(maxLength: 160, nullable: false),
            Description = t.Column<string>(maxLength: 6000, nullable: false), BudgetTnd = t.Column<decimal>(precision: 14, scale: 2, nullable: false),
            DurationMonths = t.Column<int>(nullable: false), TemplateId = t.Column<string>(maxLength: 32, nullable: false),
            ImageUrl = t.Column<string>(maxLength: 2048, nullable: true), Status = t.Column<string>(maxLength: 16, nullable: false),
            CreatedAt = t.Column<DateTimeOffset>(nullable: false), UpdatedAt = t.Column<DateTimeOffset>(nullable: false)
        }, constraints: t => t.PrimaryKey("PK_FundraisingProjects", x => x.Id));
        m.CreateTable(name: "FundraisingCommitments", columns: t => new
        {
            Id = t.Column<Guid>(nullable: false), ProjectId = t.Column<Guid>(nullable: false), FanUserId = t.Column<Guid>(nullable: true),
            DisplayName = t.Column<string>(maxLength: 80, nullable: false), Phone = t.Column<string>(maxLength: 32, nullable: true),
            Email = t.Column<string>(maxLength: 254, nullable: true), MonthlyAmountTnd = t.Column<decimal>(precision: 14, scale: 2, nullable: false),
            Months = t.Column<int>(nullable: false), PaymentMethod = t.Column<string>(maxLength: 16, nullable: false),
            AccessTokenHash = t.Column<string>(maxLength: 64, nullable: false), CreatedAt = t.Column<DateTimeOffset>(nullable: false)
        }, constraints: t =>
        {
            t.PrimaryKey("PK_FundraisingCommitments", x => x.Id);
            t.ForeignKey("FK_FundraisingCommitments_FundraisingProjects_ProjectId", x => x.ProjectId, "FundraisingProjects", "Id", onDelete: ReferentialAction.Restrict);
        });
        m.AddColumn<Guid>(name: "FundraisingProjectId", table: "SupporterBricks", nullable: true);
        m.AddColumn<Guid>(name: "FundraisingCommitmentId", table: "SupporterBricks", nullable: true);
        m.AddColumn<int>(name: "InstallmentNumber", table: "SupporterBricks", nullable: true);
        m.CreateIndex("IX_FundraisingProjects_Status_CreatedAt", "FundraisingProjects", new[] { "Status", "CreatedAt" });
        m.CreateIndex("IX_FundraisingCommitments_ProjectId", "FundraisingCommitments", "ProjectId");
        m.CreateIndex("IX_FundraisingCommitments_FanUserId", "FundraisingCommitments", "FanUserId");
        m.CreateIndex("IX_SupporterBricks_FundraisingProjectId", "SupporterBricks", "FundraisingProjectId");
        m.CreateIndex("IX_SupporterBricks_FundraisingCommitmentId_InstallmentNumber", "SupporterBricks", new[] { "FundraisingCommitmentId", "InstallmentNumber" }, unique: true);
        m.AddForeignKey("FK_SupporterBricks_FundraisingProjects_FundraisingProjectId", "SupporterBricks", "FundraisingProjectId", "FundraisingProjects", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
        m.AddForeignKey("FK_SupporterBricks_FundraisingCommitment", "SupporterBricks", "FundraisingCommitmentId", "FundraisingCommitments", principalColumn: "Id", onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder m)
    {
        m.DropForeignKey("FK_SupporterBricks_FundraisingProjects_FundraisingProjectId", "SupporterBricks");
        m.DropForeignKey("FK_SupporterBricks_FundraisingCommitment", "SupporterBricks");
        m.DropIndex("IX_SupporterBricks_FundraisingProjectId", "SupporterBricks");
        m.DropIndex("IX_SupporterBricks_FundraisingCommitmentId_InstallmentNumber", "SupporterBricks");
        m.DropColumn("FundraisingProjectId", "SupporterBricks");
        m.DropColumn("FundraisingCommitmentId", "SupporterBricks");
        m.DropColumn("InstallmentNumber", "SupporterBricks");
        m.DropTable("FundraisingCommitments");
        m.DropTable("FundraisingProjects");
    }
}
