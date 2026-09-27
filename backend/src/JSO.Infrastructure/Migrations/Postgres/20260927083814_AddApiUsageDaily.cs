using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddApiUsageDaily : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ApiUsageDaily",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    RouteGroup = table.Column<string>(type: "text", nullable: false),
                    StatusClass = table.Column<string>(type: "text", nullable: false),
                    Count = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiUsageDaily", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApiUsageDaily_Date_RouteGroup_StatusClass",
                table: "ApiUsageDaily",
                columns: new[] { "Date", "RouteGroup", "StatusClass" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiUsageDaily");
        }
    }
}
