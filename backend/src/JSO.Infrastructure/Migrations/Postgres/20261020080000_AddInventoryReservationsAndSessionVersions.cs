using JSO.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace JSO.Infrastructure.Migrations.Postgres;

[DbContext(typeof(JsoDbContext))]
[Migration("20261020080000_AddInventoryReservationsAndSessionVersions")]
public sealed class AddInventoryReservationsAndSessionVersions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(name: "SessionVersion", table: "FanUsers", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<int>(name: "SessionVersion", table: "AdminUsers", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<int>(name: "ReservedCount", table: "TicketTypes", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<int>(name: "ReservedStock", table: "Products", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<DateTimeOffset>(name: "ReservationExpiresAt", table: "TicketOrders", type: "timestamp with time zone", nullable: true);
        migrationBuilder.AddColumn<DateTimeOffset>(name: "ReservationExpiresAt", table: "Orders", type: "timestamp with time zone", nullable: true);

        migrationBuilder.Sql("""
            UPDATE "TicketTypes" AS t
            SET "ReservedCount" = COALESCE((
                SELECT SUM(o."Quantity") FROM "TicketOrders" AS o
                WHERE o."TicketTypeId" = t."Id" AND o."Status" = 'Pending'
            ), 0);
            UPDATE "Products" AS p
            SET "ReservedStock" = COALESCE((
                SELECT SUM(i."Quantity") FROM "OrderItems" AS i
                JOIN "Orders" AS o ON o."Id" = i."OrderId"
                WHERE i."ProductId" = p."Id" AND o."Status" = 'Pending'
            ), 0);
            UPDATE "TicketOrders" SET "ReservationExpiresAt" =
                CASE WHEN "ProviderRef" IS NOT NULL THEN now() + INTERVAL '2 hours' ELSE "CreatedAt" + INTERVAL '30 minutes' END
            WHERE "Status" = 'Pending';
            UPDATE "Orders" SET "ReservationExpiresAt" =
                CASE WHEN "ProviderRef" IS NOT NULL THEN now() + INTERVAL '2 hours' ELSE "CreatedAt" + INTERVAL '30 minutes' END
            WHERE "Status" = 'Pending';
            """);

        migrationBuilder.CreateIndex(name: "IX_Orders_Status_ReservationExpiresAt", table: "Orders", columns: new[] { "Status", "ReservationExpiresAt" });
        migrationBuilder.CreateIndex(name: "IX_TicketOrders_Status_ReservationExpiresAt", table: "TicketOrders", columns: new[] { "Status", "ReservationExpiresAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Orders_Status_ReservationExpiresAt", table: "Orders");
        migrationBuilder.DropIndex(name: "IX_TicketOrders_Status_ReservationExpiresAt", table: "TicketOrders");
        migrationBuilder.DropColumn(name: "SessionVersion", table: "FanUsers");
        migrationBuilder.DropColumn(name: "SessionVersion", table: "AdminUsers");
        migrationBuilder.DropColumn(name: "ReservedCount", table: "TicketTypes");
        migrationBuilder.DropColumn(name: "ReservedStock", table: "Products");
        migrationBuilder.DropColumn(name: "ReservationExpiresAt", table: "TicketOrders");
        migrationBuilder.DropColumn(name: "ReservationExpiresAt", table: "Orders");
    }
}
