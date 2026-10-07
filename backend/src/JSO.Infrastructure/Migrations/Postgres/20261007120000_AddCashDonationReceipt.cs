using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    public partial class AddCashDonationReceiptNumber : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CashPointType",
                table: "SupporterBricks",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CashPointName",
                table: "SupporterBricks",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CashDonorPhone",
                table: "SupporterBricks",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupporterBricks_CashPointType_CreatedAt",
                table: "SupporterBricks",
                columns: new[] { "CashPointType", "CreatedAt" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SupporterBricks_CashPointType_CreatedAt",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(name: "CashPointType", table: "SupporterBricks");
            migrationBuilder.DropColumn(name: "CashPointName", table: "SupporterBricks");
            migrationBuilder.DropColumn(name: "CashDonorPhone", table: "SupporterBricks");
        }
    }
}
