using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using JSO.Domain;
using JSO.Infrastructure;

namespace JSO.Api.Controllers;

// Admin CRUD for downloadable club documents (comuniqués, règlements,
// formulaires). All writes are audited. The uploaded file lives elsewhere;
// only its public URL is stored here.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/documents")]
public sealed class AdminDocumentsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetDocuments(CancellationToken ct) =>
        Ok(await db.ClubDocuments.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateDocument(DocumentRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var document = new ClubDocument
        {
            Title = request.Title.Trim(),
            Category = request.Category?.Trim(),
            FileUrl = request.FileUrl.Trim(),
            IsPublished = request.IsPublished
        };
        db.ClubDocuments.Add(document);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "ClubDocument", document.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { document.Title, document.Category, document.IsPublished }, ct);
        return Created($"/api/admin/documents/{document.Id}", document);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateDocument(Guid id, DocumentRequest request, CancellationToken ct)
    {
        var document = await db.ClubDocuments.FindAsync([id], ct);
        if (document is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        document.Title = request.Title.Trim();
        document.Category = request.Category?.Trim();
        document.FileUrl = request.FileUrl.Trim();
        document.IsPublished = request.IsPublished;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "ClubDocument", document.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { document.Title, document.Category, document.IsPublished }, ct);
        return Ok(document);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteDocument(Guid id, CancellationToken ct)
    {
        var document = await db.ClubDocuments.FindAsync([id], ct);
        if (document is null) return NotFound();
        db.ClubDocuments.Remove(document);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "ClubDocument", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(DocumentRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Title) || r.Title.Trim().Length > 180)
            return "Title is required and must be at most 180 characters.";
        if (string.IsNullOrWhiteSpace(r.FileUrl)) return "FileUrl is required.";
        if (!IsSafeDocumentUrl(r.FileUrl))
            return "FileUrl must be a relative site path or an absolute http/https URL.";
        if (r.Category?.Trim().Length > 100)
            return "Category must be at most 100 characters.";
        return null;
    }

    private static bool IsSafeDocumentUrl(string value)
    {
        value = value.Trim();
        if (value.Length == 0 || value.Length > 2048 || value.Any(char.IsControl)
            || value.StartsWith("//", StringComparison.Ordinal)
            || value.StartsWith(@"\\", StringComparison.Ordinal))
            return false;
        if (Uri.TryCreate(value, UriKind.Absolute, out var absolute))
            return absolute.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
                || absolute.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
        return !value.StartsWith('\\') && !value.StartsWith(':');

    }
}

public sealed record DocumentRequest(
    string Title,
    string? Category,
    string FileUrl,
    bool IsPublished = false);
