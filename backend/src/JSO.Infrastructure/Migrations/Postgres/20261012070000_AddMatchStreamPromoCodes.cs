using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    public partial class AddMatchStreamPromoCodes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "DiscountPercent", table: "MatchStreamAccesses", type: "integer", nullable: false, defaultValue: 0);
            migrationBuilder.CreateTable(
                name: "MatchStreamPromoCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MatchStreamId = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    DiscountPercent = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    MaxUses = table.Column<int>(type: "integer", nullable: true),
                    Uses = table.Column<int>(type: "integer", nullable: false),
                    IsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchStreamPromoCodes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchStreamPromoCodes_MatchStreams_MatchStreamId",
                        column: x => x.MatchStreamId,
                        principalTable: "MatchStreams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
            migrationBuilder.CreateIndex(
                name: "IX_MatchStreamPromoCodes_MatchStreamId_Code",
                table: "MatchStreamPromoCodes",
                columns: new[] { "MatchStreamId", "Code" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "DiscountPercent", table: "MatchStreamAccesses");
            migrationBuilder.DropTable(name: "MatchStreamPromoCodes");
        }
    }
}