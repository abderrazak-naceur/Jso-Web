using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddCommunityProgram : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CommunityPrograms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    PartnerName = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    IsPublished = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommunityPrograms", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommunityPrograms_IsPublished_StartDate",
                table: "CommunityPrograms",
                columns: new[] { "IsPublished", "StartDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommunityPrograms");
        }
    }
}
