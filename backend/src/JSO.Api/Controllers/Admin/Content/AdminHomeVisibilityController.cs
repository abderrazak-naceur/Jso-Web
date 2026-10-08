using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Admin on/off toggles for the public home page sections. Persisted as a single
// SiteContent row (key "home_hidden_sections", value = comma-separated section
// ids that are hidden). No new entity/table: reuses SiteContent, so no
// migration. The public site reads the same value from /api/home content.
[ApiController]
[Authorize(Roles = "SuperAdmin,ClubAdmin,Editor")]
[Route("api/admin/home-visibility")]
public sealed class AdminHomeVisibilityController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // The SiteContent key holding the hidden-section ids (CSV).
    public const string ContentKey = "home_hidden_sections";

    // Toggleable home sections. Ids must match the frontend SITE_SECTIONS ids.
    // Order here drives the admin list order; labels are French UI copy.
    private static readonly (string Id, string Label)[] Sections =
    [
        ("matches", "Matchs"),
        ("news", "Actualités"),
        ("team", "Équipe"),
        ("club", "Le Club"),
        ("shop", "Boutique"),
        ("memberships", "Abonnements"),
        ("media", "Médias"),
        ("events", "Agenda"),
        ("community", "Communauté"),
        ("archive", "Musée"),
        ("mobile", "App mobile"),
        ("sponsors", "Partenaires"),
        ("infos", "Infos pratiques"),
    ];

    private static readonly HashSet<string> KnownIds = Sections.Select(s => s.Id).ToHashSet();

    // Returns every section with its current enabled/disabled state.
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var hidden = await ReadHiddenAsync(db, ct);
        var sections = Sections.Select(s => new
        {
            id = s.Id,
            label = s.Label,
            enabled = !hidden.Contains(s.Id),
        });
        return Ok(sections);
    }

    // Replaces the hidden-section set. Body: { hidden: ["media", "archive"] }.
    // Unknown ids are ignored so the stored value stays clean.
    [HttpPut]
    public async Task<IActionResult> Update(HomeVisibilityRequest request, CancellationToken ct)
    {
        var hidden = (request.Hidden ?? [])
            .Select(x => x?.Trim().ToLowerInvariant() ?? "")
            .Where(KnownIds.Contains)
            .Distinct()
            .OrderBy(x => x)
            .ToList();
        var value = string.Join(",", hidden);

        var item = await db.SiteContents.SingleOrDefaultAsync(x => x.Key == ContentKey, ct);
        var userEmail = User.FindFirst("email")?.Value;
        if (item is null)
        {
            item = new SiteContent { Key = ContentKey, Value = value, UpdatedBy = userEmail };
            db.SiteContents.Add(item);
        }
        else
        {
            item.Value = value;
            item.UpdatedAt = DateTimeOffset.UtcNow;
            item.UpdatedBy = userEmail;
        }
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "SiteContent", item.Id.ToString(), User.FindFirst("sub")?.Value,
            userEmail, HttpContext.Connection.RemoteIpAddress?.ToString(), new { key = ContentKey, hidden }, ct);

        return Ok(new { hidden });
    }

    private static async Task<HashSet<string>> ReadHiddenAsync(JsoDbContext db, CancellationToken ct)
    {
        var row = await db.SiteContents.AsNoTracking().SingleOrDefaultAsync(x => x.Key == ContentKey, ct);
        if (row is null || string.IsNullOrWhiteSpace(row.Value)) return [];
        return row.Value
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => x.ToLowerInvariant())
            .Where(KnownIds.Contains)
            .ToHashSet();
    }
}

public sealed record HomeVisibilityRequest(List<string>? Hidden);
