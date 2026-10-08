using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin management for community programs with local schools and partners
// (idea G23). All routes require the ClubAdmin or CommunityManager role and
// every write is audited.
//
// Privacy/GDPR: the optional partner ContactEmail is held with the partner's
// consent for organisational use only and is never exposed on the public feed.
// No data about minors is stored here; consent for initiatives involving
// children is handled on the school side.
[ApiController]
[Authorize(Roles = "ClubAdmin,CommunityManager")]
[Route("api/admin/community-programs")]
public sealed class AdminCommunityProgramsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPrograms(CancellationToken ct) =>
        Ok(await db.CommunityPrograms.AsNoTracking()
            .OrderBy(x => x.StartDate)
            .ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateProgram(CommunityProgramRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var program = new CommunityProgram
        {
            Title = request.Title.Trim(),
            PartnerName = request.PartnerName.Trim(),
            Description = request.Description.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            ContactEmail = string.IsNullOrWhiteSpace(request.ContactEmail) ? null : request.ContactEmail.Trim(),
            IsPublished = request.IsPublished
        };
        db.CommunityPrograms.Add(program);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "CommunityProgram", program.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { program.Title, program.PartnerName, program.IsPublished }, ct);
        return Created($"/api/admin/community-programs/{program.Id}", program);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProgram(Guid id, CommunityProgramRequest request, CancellationToken ct)
    {
        var program = await db.CommunityPrograms.FindAsync([id], ct);
        if (program is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        program.Title = request.Title.Trim();
        program.PartnerName = request.PartnerName.Trim();
        program.Description = request.Description.Trim();
        program.StartDate = request.StartDate;
        program.EndDate = request.EndDate;
        program.ContactEmail = string.IsNullOrWhiteSpace(request.ContactEmail) ? null : request.ContactEmail.Trim();
        program.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "CommunityProgram", program.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { program.Title, program.PartnerName, program.IsPublished }, ct);
        return Ok(program);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProgram(Guid id, CancellationToken ct)
    {
        var program = await db.CommunityPrograms.FindAsync([id], ct);
        if (program is null) return NotFound();

        db.CommunityPrograms.Remove(program);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "CommunityProgram", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(CommunityProgramRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Title)) return "Title is required.";
        if (string.IsNullOrWhiteSpace(r.PartnerName)) return "PartnerName is required.";
        if (string.IsNullOrWhiteSpace(r.Description)) return "Description is required.";
        if (r.EndDate is not null && r.EndDate < r.StartDate) return "EndDate must be on or after StartDate.";
        if (!string.IsNullOrWhiteSpace(r.ContactEmail) && !r.ContactEmail.Contains('@'))
            return "ContactEmail must be a valid e-mail address.";
        return null;
    }
}

public sealed record CommunityProgramRequest(
    string Title,
    string PartnerName,
    string Description,
    DateTimeOffset StartDate,
    DateTimeOffset? EndDate,
    string? ContactEmail,
    bool IsPublished = false);
