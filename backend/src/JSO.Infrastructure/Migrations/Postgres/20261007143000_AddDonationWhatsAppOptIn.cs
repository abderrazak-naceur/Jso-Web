using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261007143000_AddDonationWhatsAppOptIn")]
public partial class AddDonationWhatsAppOptIn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "DonorPhone", table: "SupporterBricks",
            type: "character varying(32)", maxLength: 32, nullable: true);
        migrationBuilder.AddColumn<bool>(
            name: "WhatsAppOptIn", table: "SupporterBricks",
            type: "boolean", nullable: false, defaultValue: false);
        migrationBuilder.CreateIndex(
            name: "IX_SupporterBricks_WhatsAppOptIn_CreatedAt",
            table: "SupporterBricks",
            columns: new[] { "WhatsAppOptIn", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_SupporterBricks_WhatsAppOptIn_CreatedAt", table: "SupporterBricks");
        migrationBuilder.DropColumn(name: "DonorPhone", table: "SupporterBricks");
        migrationBuilder.DropColumn(name: "WhatsAppOptIn", table: "SupporterBricks");
    }
}