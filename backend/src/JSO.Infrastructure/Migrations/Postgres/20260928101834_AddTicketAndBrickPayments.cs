using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddTicketAndBrickPayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ChargedAmount",
                table: "TicketOrders",
                type: "numeric(14,2)",
                precision: 14,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChargedCurrency",
                table: "TicketOrders",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "TicketOrders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PaidAt",
                table: "TicketOrders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProvider",
                table: "TicketOrders",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProviderRef",
                table: "TicketOrders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ChargedAmount",
                table: "SupporterBricks",
                type: "numeric(14,2)",
                precision: 14,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChargedCurrency",
                table: "SupporterBricks",
                type: "character varying(8)",
                maxLength: 8,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "SupporterBricks",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentProvider",
                table: "SupporterBricks",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentStatus",
                table: "SupporterBricks",
                type: "text",
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "ProviderRef",
                table: "SupporterBricks",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketOrders_ProviderRef",
                table: "TicketOrders",
                column: "ProviderRef",
                unique: true,
                filter: "\"ProviderRef\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SupporterBricks_ProviderRef",
                table: "SupporterBricks",
                column: "ProviderRef",
                unique: true,
                filter: "\"ProviderRef\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TicketOrders_ProviderRef",
                table: "TicketOrders");

            migrationBuilder.DropIndex(
                name: "IX_SupporterBricks_ProviderRef",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "ChargedAmount",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "ChargedCurrency",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "PaymentProvider",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "ProviderRef",
                table: "TicketOrders");

            migrationBuilder.DropColumn(
                name: "ChargedAmount",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "ChargedCurrency",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "PaymentProvider",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "PaymentStatus",
                table: "SupporterBricks");

            migrationBuilder.DropColumn(
                name: "ProviderRef",
                table: "SupporterBricks");
        }
    }
}
