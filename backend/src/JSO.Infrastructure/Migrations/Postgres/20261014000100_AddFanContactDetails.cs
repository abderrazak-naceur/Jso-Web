using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261014000100_AddFanContactDetails")]
public sealed class AddFanContactDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(name: "FirstName", table: "FanUsers", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "LastName", table: "FanUsers", type: "text", nullable: true);
        migrationBuilder.AddColumn<string>(name: "PhoneNumber", table: "FanUsers", type: "text", nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "FirstName", table: "FanUsers");
        migrationBuilder.DropColumn(name: "LastName", table: "FanUsers");
        migrationBuilder.DropColumn(name: "PhoneNumber", table: "FanUsers");
    }
}
