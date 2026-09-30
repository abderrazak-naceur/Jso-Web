using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace JSO.Infrastructure.Migrations.Postgres
{
    /// <inheritdoc />
    public partial class AddStaffAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StaffAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AdminUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "text", nullable: false),
                    ScopeType = table.Column<string>(type: "text", nullable: false),
                    ScopeId = table.Column<string>(type: "text", nullable: true),
                    GateId = table.Column<string>(type: "text", nullable: true),
                    DeviceId = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ValidFrom = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ValidTo = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StaffAssignments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StaffAssignments_AdminUserId_IsActive",
                table: "StaffAssignments",
                columns: new[] { "AdminUserId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffAssignments_Role_ScopeType_ScopeId_IsActive",
                table: "StaffAssignments",
                columns: new[] { "Role", "ScopeType", "ScopeId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_StaffAssignments_GateId_DeviceId_IsActive",
                table: "StaffAssignments",
                columns: new[] { "GateId", "DeviceId", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StaffAssignments");
        }
    }
}
