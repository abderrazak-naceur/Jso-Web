using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261019090000_AddTicketPromoCodes")]
public sealed class AddTicketPromoCodes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "PromoCode", table: "TicketOrders", type: "character varying(40)", maxLength: 40, nullable: true);
        migrationBuilder.CreateTable(
            name: "TicketPromoCodes",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                MaxUses = table.Column<int>(type: "integer", nullable: true),
                Uses = table.Column<int>(type: "integer", nullable: false),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_TicketPromoCodes", x => x.Id);
                table.ForeignKey("FK_TicketPromoCodes_Matches_MatchId", x => x.MatchId, "Matches", "Id", onDelete: ReferentialAction.Cascade);
            });
        migrationBuilder.CreateIndex(name: "IX_TicketPromoCodes_MatchId_Code", table: "TicketPromoCodes", columns: new[] { "MatchId", "Code" }, unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "TicketPromoCodes");
        migrationBuilder.DropColumn(name: "PromoCode", table: "TicketOrders");
    }
}
