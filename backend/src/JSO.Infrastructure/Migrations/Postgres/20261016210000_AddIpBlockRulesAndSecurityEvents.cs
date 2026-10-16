using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using JSO.Infrastructure;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261016210000_AddIpBlockRulesAndSecurityEvents")]
public partial class AddIpBlockRulesAndSecurityEvents : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "IpBlockRules",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                NetworkCidr = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                CreatedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                IsEnabled = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_IpBlockRules", x => x.Id));

        migrationBuilder.CreateTable(
            name: "SecurityTrafficEvents",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                Category = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                Signal = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                Path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                ClientAddress = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                UserAgentFamily = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                VerifiedBot = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_SecurityTrafficEvents", x => x.Id));

        migrationBuilder.CreateIndex(name: "IX_IpBlockRules_NetworkCidr_IsEnabled", table: "IpBlockRules", columns: new[] { "NetworkCidr", "IsEnabled" });
        migrationBuilder.CreateIndex(name: "IX_SecurityTrafficEvents_CreatedAt", table: "SecurityTrafficEvents", column: "CreatedAt");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "IpBlockRules");
        migrationBuilder.DropTable(name: "SecurityTrafficEvents");
    }
}
