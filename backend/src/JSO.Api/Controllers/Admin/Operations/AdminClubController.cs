using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin")]
[Route("api/admin/club")]
public sealed class AdminClubController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var club = await db.Clubs.AsNoTracking().SingleOrDefaultAsync(x => x.ShortName == "JSO", ct);
        return club is null ? NotFound() : Ok(club);
    }

    [HttpPut]
    public async Task<IActionResult> Update(ClubRequest request, CancellationToken ct)
    {
        var club = await db.Clubs.SingleOrDefaultAsync(x => x.ShortName == "JSO", ct);
        if (club is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 160)
            return BadRequest(new { message = "Club name is required and must be at most 160 characters." });
        if (string.IsNullOrWhiteSpace(request.ShortName) || request.ShortName.Length > 20)
            return BadRequest(new { message = "Short name is required and must be at most 20 characters." });
        if (string.IsNullOrWhiteSpace(request.Country) || request.Country.Length > 80)
            return BadRequest(new { message = "Country is required and must be at most 80 characters." });
        if (string.IsNullOrWhiteSpace(request.City) || request.City.Length > 100)
            return BadRequest(new { message = "City is required and must be at most 100 characters." });
        if (request.Description?.Length > 2000)
            return BadRequest(new { message = "Description must be at most 2000 characters." });
        if (request.LogoUrl?.Length > 1000)
            return BadRequest(new { message = "Logo URL must be at most 1000 characters." });

        var previousShortName = club.ShortName;
        club.Name = request.Name.Trim();
        club.ShortName = request.ShortName.Trim().ToUpperInvariant();
        club.Country = request.Country.Trim();
        club.City = request.City.Trim();
        club.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        club.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl.Trim();

        await db.SaveChangesAsync(ct);

        await audit.LogAsync(
            "UPDATE",
            "Club",
            club.Id.ToString(),
            User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { previousShortName, club.ShortName, club.Name },
            ct);

        return Ok(club);
    }
}

public sealed record ClubRequest(
    string Name,
    string ShortName,
    string Country,
    string City,
    string? Description,
    string? LogoUrl);
