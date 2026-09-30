using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20260930170000_AddGatesAndScannerDevices")]
public partial class AddGatesAndScannerDevices : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Gates",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                FacilityId = table.Column<Guid>(type: "uuid", nullable: true),
                Code = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "text", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_Gates", x => x.Id));

        migrationBuilder.CreateTable(
            name: "ScannerDevices",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                GateId = table.Column<Guid>(type: "uuid", nullable: true),
                DeviceCode = table.Column<string>(type: "text", nullable: false),
                Name = table.Column<string>(type: "text", nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table => table.PrimaryKey("PK_ScannerDevices", x => x.Id));

        migrationBuilder.CreateIndex(name: "IX_Gates_FacilityId_Code", table: "Gates", columns: new[] { "FacilityId", "Code" }, unique: true);
        migrationBuilder.CreateIndex(name: "IX_Gates_IsActive_Code", table: "Gates", columns: new[] { "IsActive", "Code" });
        migrationBuilder.CreateIndex(name: "IX_ScannerDevices_DeviceCode", table: "ScannerDevices", column: "DeviceCode", unique: true);
        migrationBuilder.CreateIndex(name: "IX_ScannerDevices_GateId_IsActive", table: "ScannerDevices", columns: new[] { "GateId", "IsActive" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "ScannerDevices");
        migrationBuilder.DropTable(name: "Gates");
    }
}