using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class ExtendMatchEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecondaryPlayerName",
                table: "MatchEvents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Team",
                table: "MatchEvents",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchEvents_MatchId",
                table: "MatchEvents",
                column: "MatchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MatchEvents_MatchId",
                table: "MatchEvents");

            migrationBuilder.DropColumn(
                name: "SecondaryPlayerName",
                table: "MatchEvents");

            migrationBuilder.DropColumn(
                name: "Team",
                table: "MatchEvents");
        }
    }
}
