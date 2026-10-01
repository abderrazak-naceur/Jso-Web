using JSO.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Route("api/shop")]
public sealed class ShopController(JsoDbContext db, ContentTranslationService translations) : ControllerBase
{
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts([FromQuery] string? category, CancellationToken ct)
    {
        var query = db.Products.AsNoTracking().Where(x => x.IsActive);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(x => x.Category == category);

        var entities = await query
            .OrderBy(x => x.Category).ThenBy(x => x.Name)
            .ToListAsync(ct);
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Product", entities.Select(x => x.Id), ["name", "description", "category"], language, ct);
        var products = entities.Select(x => new
        {
            x.Id,
            Name = ContentTranslationService.ResolveFromMap(map, "Product", x.Id, "name", x.Name, language),
            x.Slug,
            Description = ContentTranslationService.ResolveFromMap(map, "Product", x.Id, "description", x.Description, language),
            x.Price,
            x.Currency,
            x.ImageUrl,
            Category = ContentTranslationService.ResolveFromMap(map, "Product", x.Id, "category", x.Category, language),
            inStock = x.Stock > 0
        }).ToList();

        return Ok(products);
    }

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> GetProduct(string slug, CancellationToken ct)
    {
        var normalized = slug.Trim().ToLowerInvariant();
        var product = await db.Products.AsNoTracking()
            .Where(x => x.IsActive && x.Slug == normalized)
            .SingleOrDefaultAsync(ct);

        if (product is null) return NotFound();
        var language = RequestLanguage.Get(Request);
        var map = await translations.LoadAsync("Product", [product.Id], ["name", "description", "category"], language, ct);
        return Ok(new
        {
            product.Id,
            Name = ContentTranslationService.ResolveFromMap(map, "Product", product.Id, "name", product.Name, language),
            product.Slug,
            Description = ContentTranslationService.ResolveFromMap(map, "Product", product.Id, "description", product.Description, language),
            product.Price,
            product.Currency,
            product.ImageUrl,
            Category = ContentTranslationService.ResolveFromMap(map, "Product", product.Id, "category", product.Category, language),
            inStock = product.Stock > 0
        });
    }
}
