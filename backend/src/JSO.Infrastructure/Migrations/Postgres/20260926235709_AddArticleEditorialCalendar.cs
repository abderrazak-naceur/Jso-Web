using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddArticleEditorialCalendar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EditorialStatus",
                table: "Articles",
                type: "text",
                nullable: false,
                defaultValue: "Draft");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ScheduledAt",
                table: "Articles",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Articles_EditorialStatus_ScheduledAt",
                table: "Articles",
                columns: new[] { "EditorialStatus", "ScheduledAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Articles_EditorialStatus_ScheduledAt",
                table: "Articles");

            migrationBuilder.DropColumn(
                name: "EditorialStatus",
                table: "Articles");

            migrationBuilder.DropColumn(
                name: "ScheduledAt",
                table: "Articles");
        }
    }
}
