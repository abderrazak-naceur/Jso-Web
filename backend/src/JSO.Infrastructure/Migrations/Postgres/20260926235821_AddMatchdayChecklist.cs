using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddMatchdayChecklist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchdayChecklistItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    Done = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    AssigneeAdminId = table.Column<Guid>(type: "uuid", nullable: true),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchdayChecklistItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MatchdayChecklistTemplateItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchdayChecklistTemplateItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchdayChecklistItems_MatchId",
                table: "MatchdayChecklistItems",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_MatchdayChecklistItems_MatchId_Label",
                table: "MatchdayChecklistItems",
                columns: new[] { "MatchId", "Label" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchdayChecklistTemplateItems_IsActive_DisplayOrder",
                table: "MatchdayChecklistTemplateItems",
                columns: new[] { "IsActive", "DisplayOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchdayChecklistItems");

            migrationBuilder.DropTable(
                name: "MatchdayChecklistTemplateItems");
        }
    }
}
