using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddScoutingNote : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ScoutingNotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "text", nullable: false),
                    SubjectType = table.Column<string>(type: "text", nullable: false, defaultValue: "Opponent"),
                    MatchId = table.Column<Guid>(type: "uuid", nullable: true),
                    Rating = table.Column<int>(type: "integer", nullable: true),
                    Body = table.Column<string>(type: "text", nullable: true),
                    AuthorAdminId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoutingNotes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingNotes_MatchId",
                table: "ScoutingNotes",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoutingNotes_SubjectType_CreatedAt",
                table: "ScoutingNotes",
                columns: new[] { "SubjectType", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScoutingNotes");
        }
    }
}
