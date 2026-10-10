using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    public partial class AddFanLoginLoyaltyLevels : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LoginDaysCount",
                table: "FanUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LastLoginDate",
                table: "FanUsers",
                type: "date",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "LoginDaysCount", table: "FanUsers");
            migrationBuilder.DropColumn(name: "LastLoginDate", table: "FanUsers");
        }
    }
}