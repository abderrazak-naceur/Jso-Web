using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261013190000_AddFanAccountModeration")]
public sealed class AddFanAccountModeration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "FanRatingStars",
            table: "FanUsers",
            type: "integer",
            nullable: false,
            defaultValue: 1);

        migrationBuilder.AddColumn<bool>(
            name: "IsVip",
            table: "FanUsers",
            type: "boolean",
            nullable: false,
            defaultValue: false);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "FanRatingStars", table: "FanUsers");
        migrationBuilder.DropColumn(name: "IsVip", table: "FanUsers");
    }
}
