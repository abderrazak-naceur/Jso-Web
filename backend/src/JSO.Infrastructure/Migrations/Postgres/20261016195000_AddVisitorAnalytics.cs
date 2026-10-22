using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using JSO.Infrastructure;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261016195000_AddVisitorAnalytics")]
public partial class AddVisitorAnalytics : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "VisitorPageViews",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                Path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                ReferrerHost = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                DeviceClass = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                VisitorKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_VisitorPageViews", x => x.Id));

        migrationBuilder.CreateIndex(name: "IX_VisitorPageViews_CreatedAt", table: "VisitorPageViews", column: "CreatedAt");
        migrationBuilder.CreateIndex(name: "IX_VisitorPageViews_Path_CreatedAt", table: "VisitorPageViews", columns: new[] { "Path", "CreatedAt" });
        migrationBuilder.CreateIndex(name: "IX_VisitorPageViews_VisitorKey_CreatedAt", table: "VisitorPageViews", columns: new[] { "VisitorKey", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "VisitorPageViews");
    }
}
