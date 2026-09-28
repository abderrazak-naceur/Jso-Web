using System.Security.Claims;
using JSO.Domain;
using JSO.Infrastructure;
using JSO.Infrastructure.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Fan-facing shop orders. A fan builds a cart client-side and posts the lines
// here; the server ALWAYS recomputes name/price from the catalog (never trusts
// the client) and validates that each product is active. Orders start Pending;
// payment is confirmed by an admin (manual gateway) which is when stock is
// decremented. A fan can only see their own orders (identity from the JWT).
[ApiController]
[Authorize(Roles = "Fan")]
[Route("api/shop/orders")]
public sealed class ShopOrdersController(
    JsoDbContext db,
    AuditService audit,
    PaymentProviderSelector paymentSelector,
    Microsoft.Extensions.Configuration.IConfiguration configuration) : ControllerBase
{
    private Guid? CurrentFanId()
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyOrders(CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var orders = await db.Orders.AsNoTracking()
            .Where(x => x.FanUserId == fanId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Status, x.Currency, x.Total, x.CreatedAt, x.PaidAt })
            .ToListAsync(ct);

        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMyOrder(Guid id, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var order = await db.Orders.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (order is null) return NotFound();

        var items = await db.OrderItems.AsNoTracking()
            .Where(x => x.OrderId == id)
            .Select(x => new { x.ProductId, x.ProductName, x.UnitPrice, x.Quantity, x.LineTotal })
            .ToListAsync(ct);

        return Ok(new { order.Id, order.Status, order.Currency, order.Total, order.CreatedAt, order.PaidAt, items });
    }

    [HttpPost]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> CreateOrder(CreateOrderRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        if (request.Items is null || request.Items.Count == 0)
            return BadRequest(new { message = "The cart is empty." });
        if (request.Items.Count > 50)
            return BadRequest(new { message = "Too many items in a single order." });

        // Collapse duplicate product ids and validate quantities.
        var lines = new Dictionary<Guid, int>();
        foreach (var item in request.Items)
        {
            if (item.Quantity < 1 || item.Quantity > 99)
                return BadRequest(new { message = "Each quantity must be between 1 and 99." });
            lines[item.ProductId] = lines.TryGetValue(item.ProductId, out var q) ? q + item.Quantity : item.Quantity;
        }

        var productIds = lines.Keys.ToList();
        var products = await db.Products.AsNoTracking()
            .Where(p => productIds.Contains(p.Id))
            .ToListAsync(ct);

        var order = new Order
        {
            FanUserId = fanId.Value,
            Status = "Pending",
            Currency = "TND",
            CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? null : request.CustomerName.Trim(),
            CustomerEmail = string.IsNullOrWhiteSpace(request.CustomerEmail) ? null : request.CustomerEmail.Trim(),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim()
        };

        var orderItems = new List<OrderItem>();
        decimal total = 0m;
        foreach (var (productId, quantity) in lines)
        {
            var product = products.FirstOrDefault(p => p.Id == productId);
            if (product is null || !product.IsActive)
                return BadRequest(new { message = "A product in the cart is no longer available.", productId });
            if (product.Stock < quantity)
                return BadRequest(new { message = $"Not enough stock for '{product.Name}'.", productId });

            var lineTotal = product.Price * quantity;
            total += lineTotal;
            orderItems.Add(new OrderItem
            {
                OrderId = order.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                UnitPrice = product.Price,
                Quantity = quantity,
                LineTotal = lineTotal
            });
        }

        order.Total = total;
        db.Orders.Add(order);
        db.OrderItems.AddRange(orderItems);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("CREATE", "Order", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { order.Total, order.Currency, items = orderItems.Count }, ct);

        return Created($"/api/shop/orders/{order.Id}", new
        {
            order.Id,
            order.Status,
            order.Currency,
            order.Total,
            order.CreatedAt,
            items = orderItems.Select(x => new { x.ProductId, x.ProductName, x.UnitPrice, x.Quantity, x.LineTotal })
        });
    }

    // Starts an online payment for one of the fan's own Pending orders. The
    // buyer picks the country at checkout: Tunisia -> Flouci (TND), otherwise
    // Stripe (international). We create a HOSTED payment session with the chosen
    // provider (no card data ever touches our servers), persist the provider,
    // country and ProviderRef, and return the redirect URL. The order is NOT
    // marked paid here - only the provider webhook (verified server-side) does
    // that. When the provider is not configured (e.g. sandbox without keys) this
    // returns a clean 503 the UI can handle instead of crashing.
    [HttpPost("{id:guid}/pay")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Pay(Guid id, PayOrderRequest request, CancellationToken ct)
    {
        var fanId = CurrentFanId();
        if (fanId is null) return Unauthorized();

        var country = request.Country?.Trim();
        if (string.IsNullOrWhiteSpace(country))
            return BadRequest(new { message = "Le pays est requis pour choisir le mode de paiement." });

        var order = await db.Orders.SingleOrDefaultAsync(x => x.Id == id && x.FanUserId == fanId, ct);
        if (order is null) return NotFound();
        if (order.Status != "Pending")
            return BadRequest(new { message = "Cette commande n'est plus en attente de paiement." });

        var provider = paymentSelector.Select(country);
        var isTunisia = PaymentProviderSelector.IsTunisia(country);

        if (!provider.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible. Veuillez réessayer plus tard." });

        var baseUrl = ResolvePublicBaseUrl();
        var returnUrl = $"{baseUrl}/payment/success?orderId={order.Id}";
        var cancelUrl = $"{baseUrl}/payment/cancel?orderId={order.Id}";

        PaymentInitiation initiation;
        try
        {
            initiation = await provider.InitiatePaymentAsync(order, returnUrl, cancelUrl, ct);
        }
        catch (PaymentProviderNotConfiguredException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = $"Le paiement en ligne via {provider.Name} n'est pas encore disponible. Veuillez réessayer plus tard." });
        }
        catch (PaymentProviderException ex)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { message = ex.Message });
        }

        // Persist the routing decision and the provider reference for webhook
        // reconciliation. Currency is TND for Flouci; for Stripe we settle in the
        // configured international currency (EUR by default).
        order.PaymentProvider = provider.Name;
        order.Country = country;
        order.ProviderRef = initiation.ProviderRef;
        order.Currency = isTunisia ? "TND" : (configuration["Payments:Stripe:Currency"] ?? "eur").ToUpperInvariant();
        await db.SaveChangesAsync(ct);

        await audit.LogAsync("ORDER_PAY_INIT", "Order", order.Id.ToString(), fanId.Value.ToString(),
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { provider = provider.Name, order.Country }, ct);

        return Ok(new { redirectUrl = initiation.RedirectUrl, provider = provider.Name });
    }

    // Resolves the public frontend base URL used to build the provider
    // return/cancel links. Prefers an explicit "Payments:PublicBaseUrl", then the
    // first configured CORS origin, then the current request host.
    private string ResolvePublicBaseUrl()
    {
        var explicitBase = configuration["Payments:PublicBaseUrl"];
        if (!string.IsNullOrWhiteSpace(explicitBase))
            return explicitBase.TrimEnd('/');

        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (origins is { Length: > 0 } && !string.IsNullOrWhiteSpace(origins[0]))
            return origins[0].TrimEnd('/');

        return $"{Request.Scheme}://{Request.Host}";
    }
}

public sealed record PayOrderRequest(string Country);

public sealed record CreateOrderRequest(
    List<CreateOrderLine> Items,
    string? CustomerName = null,
    string? CustomerEmail = null,
    string? Note = null);

public sealed record CreateOrderLine(Guid ProductId, int Quantity);
