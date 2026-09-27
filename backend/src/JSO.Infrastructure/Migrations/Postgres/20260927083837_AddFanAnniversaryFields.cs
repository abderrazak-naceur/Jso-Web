using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddFanAnniversaryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AnniversaryOptIn",
                table: "FanUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "BirthDate",
                table: "FanUsers",
                type: "date",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FanUsers_AnniversaryOptIn",
                table: "FanUsers",
                column: "AnniversaryOptIn");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FanUsers_AnniversaryOptIn",
                table: "FanUsers");

            migrationBuilder.DropColumn(
                name: "AnniversaryOptIn",
                table: "FanUsers");

            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "FanUsers");
        }
    }
}
