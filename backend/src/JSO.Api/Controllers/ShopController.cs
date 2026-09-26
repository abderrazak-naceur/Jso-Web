using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/shop")]
public sealed class ShopController(JsoDbContext db) : ControllerBase
{
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(x => x.Category == category);

        var products = await query
            .OrderBy(x => x.Category).ThenBy(x => x.Name)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Slug,
                x.Description,
                x.Price,
                x.Currency,
                x.ImageUrl,
                x.Category,
                inStock = x.Stock > 0
            })
            .ToListAsync(ct);

        return Ok(products);
    }

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> GetProduct(string slug, CancellationToken ct)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        var product = await db.Products.AsNoTracking()
            .Where(x => x.IsActive && x.Slug == normalized)
            .Select(x => new
            {
                x.Id,
                x.Name,
                x.Slug,
                x.Description,
                x.Price,
                x.Currency,
                x.ImageUrl,
                x.Category,
                inStock = x.Stock > 0
            })
            .SingleOrDefaultAsync(ct);

        return product is null ? NotFound() : Ok(product);
    }
}
