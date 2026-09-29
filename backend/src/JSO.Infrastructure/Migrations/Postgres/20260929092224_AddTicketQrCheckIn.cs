using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddTicketQrCheckIn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CheckedInAt",
                table: "TicketOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CheckedInByAdminId",
                table: "TicketOrders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "IssuedAt",
                table: "TicketOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicTicketToken",
                table: "TicketOrders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TicketCheckIns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketOrderId = table.Column<Guid>(type: "uuid", nullable: true),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    CheckedInByAdminId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CheckedInAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeviceId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Result = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketCheckIns", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TicketOrders_PublicTicketToken",
                table: "TicketOrders",
                column: "PublicTicketToken",
                unique: true,
                filter: "\"PublicTicketToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_TicketCheckIns_MatchId_CheckedInAt",
                table: "TicketCheckIns",
                columns: new[] { "MatchId", "CheckedInAt" });

            migrationBuilder.CreateIndex(
                name: "IX_TicketCheckIns_TicketOrderId",
                table: "TicketCheckIns",
                column: "TicketOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TicketCheckIns");

            migrationBuilder.DropIndex(
                name: "IX_TicketOrders_PublicTicketToken",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "CheckedInByAdminId",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "IssuedAt",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "PublicTicketToken",
                table: "TicketOrders");
        }
    }
}
