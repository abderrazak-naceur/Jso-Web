using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261027123000_AddMatchTicketDesignJson")]
public sealed class AddMatchTicketDesignJson : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TicketDesignJson",
            table: "Matches",
            type: "jsonb",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "TicketDesignJson", table: "Matches");
    }
}
