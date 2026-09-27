using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddSponsorActivation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActivationSlug",
                table: "Sponsors",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SponsorActivations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SponsorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Channel = table.Column<string>(type: "text", nullable: true),
                    ScannedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SponsorActivations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sponsors_ActivationSlug",
                table: "Sponsors",
                column: "ActivationSlug",
                unique: true,
                filter: "\"ActivationSlug\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_SponsorActivations_SponsorId_ScannedAt",
                table: "SponsorActivations",
                columns: new[] { "SponsorId", "ScannedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SponsorActivations");

            migrationBuilder.DropIndex(
                name: "IX_Sponsors_ActivationSlug",
                table: "Sponsors");

            migrationBuilder.DropColumn(
                name: "ActivationSlug",
                table: "Sponsors");
        }
    }
}
