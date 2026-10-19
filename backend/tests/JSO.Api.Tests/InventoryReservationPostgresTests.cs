using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JSO.Api.Tests;

/// <summary>
/// These tests exercise PostgreSQL's conditional UPDATE behavior, which EF
/// InMemory cannot model. Set JSO_TEST_POSTGRES to a disposable test database
/// connection string in CI to enable them.
/// </summary>
public sealed class InventoryReservationPostgresTests
{
    [PostgresFact]
    public async Task Concurrent_ticket_holds_cannot_allocate_the_last_seat_twice()
    {
        await using var fixture = await PostgresFixture.CreateOrSkip();
        var ticketType = new TicketType { Name = "Tribune", Capacity = 1, SoldCount = 0, ReservedCount = 0 };
        await using (var seed = fixture.CreateContext())
        {
            seed.TicketTypes.Add(ticketType);
            await seed.SaveChangesAsync();
        }

        async Task<int> ReserveAsync()
        {
            await using var db = fixture.CreateContext();
            return await new InventoryReservationService(db).TryReserveTicketAsync(ticketType.Id, 1, default);
        }

        var results = await Task.WhenAll(ReserveAsync(), ReserveAsync());
        Assert.Equal(new[] { 0, 1 }, results.Order().ToArray());
        await using var verify = fixture.CreateContext();
        Assert.Equal(1, await verify.TicketTypes.Where(x => x.Id == ticketType.Id).Select(x => x.ReservedCount).SingleAsync());
    }

    [PostgresFact]
    public async Task Expiry_releases_ticket_and_shop_holds_once()
    {
        await using var fixture = await PostgresFixture.CreateOrSkip();
        var ticketType = new TicketType { Name = "Tribune", Capacity = 3, ReservedCount = 2 };
        var product = new Product { Name = "Scarf", Slug = "scarf", Stock = 4, ReservedStock = 2 };
        var ticketOrder = new TicketOrder
        {
            TicketTypeId = ticketType.Id, TicketTypeName = ticketType.Name, Quantity = 2,
            Status = "Pending", ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1)
        };
        var shopOrder = new Order
        {
            Status = "Pending", ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1)
        };
        await using (var seed = fixture.CreateContext())
        {
            seed.TicketTypes.Add(ticketType);
            seed.Products.Add(product);
            seed.TicketOrders.Add(ticketOrder);
            seed.Orders.Add(shopOrder);
            seed.OrderItems.Add(new OrderItem
            {
                OrderId = shopOrder.Id, ProductId = product.Id,
                ProductName = product.Name, UnitPrice = 10, Quantity = 2, LineTotal = 20
            });
            await seed.SaveChangesAsync();
        }

        await using (var db = fixture.CreateContext())
            Assert.Equal(2, await new InventoryReservationService(db).ReleaseExpiredAsync(default));
        await using (var db = fixture.CreateContext())
            Assert.Equal(0, await new InventoryReservationService(db).ReleaseExpiredAsync(default));

        await using var verify = fixture.CreateContext();
        Assert.Equal(0, await verify.TicketTypes.Where(x => x.Id == ticketType.Id).Select(x => x.ReservedCount).SingleAsync());
        Assert.Equal("Expired", await verify.TicketOrders.Where(x => x.Id == ticketOrder.Id).Select(x => x.Status).SingleAsync());
        Assert.Equal(0, await verify.Products.Where(x => x.Id == product.Id).Select(x => x.ReservedStock).SingleAsync());
        Assert.Equal("Expired", await verify.Orders.Where(x => x.Id == shopOrder.Id).Select(x => x.Status).SingleAsync());
    }

    [PostgresFact]
    public async Task Late_verified_ticket_payment_fulfils_if_capacity_remains_or_records_refund_required()
    {
        await using var fixture = await PostgresFixture.CreateOrSkip();
        var availableType = new TicketType { Name = "Available", Capacity = 1 };
        var fullType = new TicketType { Name = "Full", Capacity = 1, SoldCount = 1 };
        var canFulfil = new TicketOrder
        {
            TicketTypeId = availableType.Id, TicketTypeName = availableType.Name,
            Quantity = 1, Total = 20, Status = "Expired"
        };
        var cannotFulfil = new TicketOrder
        {
            TicketTypeId = fullType.Id, TicketTypeName = fullType.Name,
            Quantity = 1, Total = 20, Status = "Expired"
        };
        await using (var seed = fixture.CreateContext())
        {
            seed.TicketTypes.AddRange(availableType, fullType);
            seed.TicketOrders.AddRange(canFulfil, cannotFulfil);
            await seed.SaveChangesAsync();
        }

        await using (var db = fixture.CreateContext())
        {
            var completion = new TicketOrderCompletion(db, new AuditService(db));
            Assert.Equal(PayableCompletionResult.Completed,
                await completion.CompleteAsync(canFulfil.Id, "Stripe", "cs_test_available", default));
            Assert.Equal(PayableCompletionResult.RefundRequired,
                await completion.CompleteAsync(cannotFulfil.Id, "Stripe", "cs_test_full", default));
        }

        await using var verify = fixture.CreateContext();
        Assert.Equal("Confirmed", await verify.TicketOrders.Where(x => x.Id == canFulfil.Id).Select(x => x.Status).SingleAsync());
        Assert.Equal("RefundRequired", await verify.TicketOrders.Where(x => x.Id == cannotFulfil.Id).Select(x => x.Status).SingleAsync());
        Assert.Equal(1, await verify.TicketTypes.Where(x => x.Id == availableType.Id).Select(x => x.SoldCount).SingleAsync());
    }

    [PostgresFact]
    public async Task Concurrent_payment_completions_preserve_ticket_sales_and_shop_stock()
    {
        await using var fixture = await PostgresFixture.CreateOrSkip();
        var ticketType = new TicketType { Name = "Tribune", Capacity = 2, ReservedCount = 2 };
        var ticketOrders = Enumerable.Range(0, 2).Select(_ => new TicketOrder
        {
            TicketTypeId = ticketType.Id, TicketTypeName = ticketType.Name,
            Quantity = 1, Total = 10, Status = "Pending", ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10)
        }).ToArray();
        var product = new Product { Name = "Scarf", Slug = "concurrent-scarf", Stock = 2, ReservedStock = 2 };
        var shopOrders = Enumerable.Range(0, 2).Select(_ => new Order
        {
            Total = 10, Status = "Pending", ReservationExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10)
        }).ToArray();
        await using (var seed = fixture.CreateContext())
        {
            seed.TicketTypes.Add(ticketType);
            seed.TicketOrders.AddRange(ticketOrders);
            seed.Products.Add(product);
            seed.Orders.AddRange(shopOrders);
            seed.OrderItems.AddRange(shopOrders.Select(order => new OrderItem
            {
                OrderId = order.Id, ProductId = product.Id,
                ProductName = product.Name, UnitPrice = 10, Quantity = 1, LineTotal = 10
            }));
            await seed.SaveChangesAsync();
        }

        async Task<PayableCompletionResult> CompleteTicketAsync(Guid id)
        {
            await using var db = fixture.CreateContext();
            return await new TicketOrderCompletion(db, new AuditService(db))
                .CompleteAsync(id, "Stripe", "ticket_" + id, default);
        }
        async Task<PayableCompletionResult> CompleteShopAsync(Guid id)
        {
            await using var db = fixture.CreateContext();
            return await new OrderPaymentService(db, new AuditService(db))
                .CompleteAsync(id, "Stripe", "shop_" + id, default);
        }

        var ticketResults = await Task.WhenAll(ticketOrders.Select(x => CompleteTicketAsync(x.Id)));
        var shopResults = await Task.WhenAll(shopOrders.Select(x => CompleteShopAsync(x.Id)));
        Assert.All(ticketResults, result => Assert.Equal(PayableCompletionResult.Completed, result));
        Assert.All(shopResults, result => Assert.Equal(PayableCompletionResult.Completed, result));

        await using var verify = fixture.CreateContext();
        var ticketCounters = await verify.TicketTypes.Where(x => x.Id == ticketType.Id)
            .Select(x => new { x.SoldCount, x.ReservedCount }).SingleAsync();
        Assert.Equal(2, ticketCounters.SoldCount);
        Assert.Equal(0, ticketCounters.ReservedCount);
        var productCounters = await verify.Products.Where(x => x.Id == product.Id)
            .Select(x => new { x.Stock, x.ReservedStock }).SingleAsync();
        Assert.Equal(0, productCounters.Stock);
        Assert.Equal(0, productCounters.ReservedStock);
    }

    [PostgresFact]
    public async Task Late_multi_product_payment_releases_partial_reacquisition_when_refund_is_required()
    {
        await using var fixture = await PostgresFixture.CreateOrSkip();
        var available = new Product { Name = "Available", Slug = "late-available", Stock = 3 };
        var unavailable = new Product { Name = "Sold out", Slug = "late-unavailable", Stock = 0 };
        var order = new Order { Status = "Expired", Total = 20 };
        await using (var seed = fixture.CreateContext())
        {
            seed.Products.AddRange(available, unavailable);
            seed.Orders.Add(order);
            seed.OrderItems.AddRange(
                new OrderItem { OrderId = order.Id, ProductId = available.Id, ProductName = available.Name, UnitPrice = 10, Quantity = 1, LineTotal = 10 },
                new OrderItem { OrderId = order.Id, ProductId = unavailable.Id, ProductName = unavailable.Name, UnitPrice = 10, Quantity = 1, LineTotal = 10 });
            await seed.SaveChangesAsync();
        }

        await using (var db = fixture.CreateContext())
        {
            var completion = new OrderPaymentService(db, new AuditService(db));
            Assert.Equal(PayableCompletionResult.RefundRequired,
                await completion.CompleteAsync(order.Id, "Stripe", "late_multi_product", default));
        }

        await using var verify = fixture.CreateContext();
        Assert.Equal("RefundRequired", await verify.Orders.Where(x => x.Id == order.Id).Select(x => x.Status).SingleAsync());
        Assert.Equal(0, await verify.Products.Where(x => x.Id == available.Id).Select(x => x.ReservedStock).SingleAsync());
    }

    private sealed class PostgresFixture : IAsyncDisposable
    {
        private readonly string _adminConnectionString;
        private readonly string _schema;
        private readonly DbContextOptions<JsoDbContext> _options;

        private PostgresFixture(string adminConnectionString, string schema, DbContextOptions<JsoDbContext> options)
        {
            _adminConnectionString = adminConnectionString;
            _schema = schema;
            _options = options;
        }

        public static async Task<PostgresFixture> CreateOrSkip()
        {
            var connectionString = Environment.GetEnvironmentVariable("JSO_TEST_POSTGRES");
            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException("PostgresFact should skip this test when JSO_TEST_POSTGRES is not configured.");

            var schema = "jso_it_" + Guid.NewGuid().ToString("N");
            await using var admin = new NpgsqlConnection(connectionString);
            await admin.OpenAsync();
            await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", admin))
                await create.ExecuteNonQueryAsync();

            var scopedConnection = new NpgsqlConnectionStringBuilder(connectionString) { SearchPath = schema }.ConnectionString;
            var options = new DbContextOptionsBuilder<JsoDbContext>().UseNpgsql(scopedConnection).Options;
            var fixture = new PostgresFixture(connectionString, schema, options);
            try
            {
                await using var db = fixture.CreateContext();
                await db.Database.EnsureCreatedAsync();
                return fixture;
            }
            catch
            {
                await fixture.DisposeAsync();
                throw;
            }
        }

        public JsoDbContext CreateContext() => new(_options);

        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(_adminConnectionString);
            await connection.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{_schema}\" CASCADE", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("JSO_TEST_POSTGRES")))
                Skip = "Set JSO_TEST_POSTGRES to a disposable PostgreSQL database to run reservation integration tests.";
        }
    }
}
