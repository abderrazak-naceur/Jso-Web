using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/faq")]
public sealed class AdminFaqController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFaq(CancellationToken ct) =>
        Ok(await db.FaqEntries.AsNoTracking()
            .OrderBy(x => x.SortOrder).ThenBy(x => x.CreatedAt)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateFaq(FaqRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var entry = new FaqEntry
        {
            Question = request.Question.Trim(),
            Answer = request.Answer.Trim(),
            Category = request.Category?.Trim(),
            SortOrder = request.SortOrder,
            IsPublished = request.IsPublished
        };
        db.FaqEntries.Add(entry);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "FaqEntry", entry.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { entry.Category, entry.IsPublished }, ct);
        return Created($"/api/admin/faq/{entry.Id}", entry);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateFaq(Guid id, FaqRequest request, CancellationToken ct)
    {
        var entry = await db.FaqEntries.FindAsync([id], ct);
        if (entry is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        entry.Question = request.Question.Trim();
        entry.Answer = request.Answer.Trim();
        entry.Category = request.Category?.Trim();
        entry.SortOrder = request.SortOrder;
        entry.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "FaqEntry", entry.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { entry.Category, entry.IsPublished }, ct);
        return Ok(entry);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFaq(Guid id, CancellationToken ct)
    {
        var entry = await db.FaqEntries.FindAsync([id], ct);
        if (entry is null) return NotFound();
        db.FaqEntries.Remove(entry);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "FaqEntry", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(FaqRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Question)) return "Question is required.";
        if (string.IsNullOrWhiteSpace(r.Answer)) return "Answer is required.";
        return null;
    }
}

public sealed record FaqRequest(
    string Question,
    string Answer,
    string? Category,
    int SortOrder = 0,
    bool IsPublished = false);
