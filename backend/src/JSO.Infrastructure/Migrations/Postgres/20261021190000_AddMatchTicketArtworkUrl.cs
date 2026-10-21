using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using JSO.Infrastructure;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261021190000_AddMatchTicketArtworkUrl")]
public sealed class AddMatchTicketArtworkUrl : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "TicketArtworkUrl",
            table: "Matches",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "TicketArtworkUrl",
            table: "Matches");
    }
}
