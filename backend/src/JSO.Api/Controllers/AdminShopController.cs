using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,ShopManager")]
[Route("api/admin/shop/products")]
public sealed class AdminShopController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetProducts(CancellationToken ct) =>
        Ok(await db.Products.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Name)
            .ToListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id, CancellationToken ct)
    {
        var product = await db.Products.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct(ProductRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await db.Products.AnyAsync(x => x.Slug == slug, ct))
            return Conflict(new { message = "A product with this slug already exists." });

        var product = new Product
        {
            Name = request.Name.Trim(),
            Slug = slug,
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant(),
            ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim(),
            Stock = request.Stock,
            IsActive = request.IsActive
        };
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Product", product.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { product.Slug, product.Price, product.Currency }, ct);
        return Created($"/api/admin/shop/products/{product.Id}", product);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, ProductRequest request, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var slug = request.Slug.Trim().ToLowerInvariant();
        if (await db.Products.AnyAsync(x => x.Id != id && x.Slug == slug, ct))
            return Conflict(new { message = "A product with this slug already exists." });

        product.Name = request.Name.Trim();
        product.Slug = slug;
        product.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        product.Price = request.Price;
        product.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "TND" : request.Currency.Trim().ToUpperInvariant();
        product.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        product.Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category.Trim();
        product.Stock = request.Stock;
        product.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Product", product.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { product.Slug, product.Price, product.Currency }, ct);
        return Ok(product);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken ct)
    {
        var product = await db.Products.FindAsync([id], ct);
        if (product is null) return NotFound();
        db.Products.Remove(product);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "Product", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(ProductRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Trim().Length > 160)
            return "Name is required and must be at most 160 characters.";
        if (string.IsNullOrWhiteSpace(r.Slug) || r.Slug.Trim().Length > 160)
            return "Slug is required and must be at most 160 characters.";
        if (r.Price < 0) return "Price must be zero or greater.";
        if (r.Stock < 0) return "Stock must be zero or greater.";
        return null;
    }
}

public sealed record ProductRequest(
    string Name,
    string Slug,
    string? Description,
    decimal Price,
    string? Currency,
    string? ImageUrl,
    string? Category,
    int Stock = 0,
    bool IsActive = true);
