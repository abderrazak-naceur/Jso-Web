using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Volunteer roster management for matchday operations (idea D11).
// Volunteer personal data (contact) is never exposed publicly: all routes below
// require the MatchManager or ClubAdmin role and every write is audited.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/volunteers")]
public sealed class AdminVolunteersController(JsoDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetVolunteers(CancellationToken ct) =>
        Ok(await db.Volunteers.AsNoTracking()
            .OrderByDescending(x => x.IsActive).ThenBy(x => x.Role).ThenBy(x => x.Name)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateVolunteer(VolunteerRequest request, CancellationToken ct)
    {
        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        var volunteer = new Volunteer
        {
            Name = request.Name.Trim(),
            Role = request.Role.Trim(),
            // Minimizzazione GDPR: conserviamo il contatto solo con consenso esplicito.
            Contact = request.ContactConsent ? request.Contact?.Trim() : null,
            ContactConsent = request.ContactConsent,
            IsActive = request.IsActive
        };
        db.Volunteers.Add(volunteer);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "Volunteer", volunteer.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { volunteer.Role, volunteer.ContactConsent }, ct);
        return Created($"/api/admin/volunteers/{volunteer.Id}", volunteer);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateVolunteer(Guid id, VolunteerRequest request, CancellationToken ct)
    {
        var volunteer = await db.Volunteers.FindAsync([id], ct);
        if (volunteer is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        volunteer.Name = request.Name.Trim();
        volunteer.Role = request.Role.Trim();
        volunteer.Contact = request.ContactConsent ? request.Contact?.Trim() : null;
        volunteer.ContactConsent = request.ContactConsent;
        volunteer.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "Volunteer", volunteer.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { volunteer.Role, volunteer.ContactConsent }, ct);
        return Ok(volunteer);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteVolunteer(Guid id, CancellationToken ct)
    {
        var volunteer = await db.Volunteers.FindAsync([id], ct);
        if (volunteer is null) return NotFound();

        db.MatchAssignments.RemoveRange(db.MatchAssignments.Where(x => x.VolunteerId == id));
        db.Volunteers.Remove(volunteer);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "Volunteer", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), ct: ct);
        return NoContent();
    }

    private static string? Validate(VolunteerRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Name)) return "Name is required.";
        if (string.IsNullOrWhiteSpace(r.Role)) return "Role is required.";
        if (r.ContactConsent && string.IsNullOrWhiteSpace(r.Contact))
            return "Contact is required when consent is given.";
        return null;
    }
}

// Matchday assignment grid: which volunteer does which task for a given match,
// with a proposed/confirmed status. Same role restriction and audit as above.
[ApiController]
[Authorize(Roles = "MatchManager,ClubAdmin")]
[Route("api/admin/matches/{matchId:guid}/assignments")]
public sealed class AdminMatchAssignmentsController(JsoDbContext db, AuditService audit) : ControllerBase
{
    private static readonly string[] Statuses = ["Proposed", "Confirmed"];

    [HttpGet]
    public async Task<IActionResult> GetAssignments(Guid matchId, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();
        var rows = await db.MatchAssignments.AsNoTracking()
            .Where(x => x.MatchId == matchId)
            .Join(db.Volunteers.AsNoTracking(), a => a.VolunteerId, v => v.Id, (a, v) => new
            {
                a.Id,
                a.MatchId,
                a.VolunteerId,
                VolunteerName = v.Name,
                VolunteerRole = v.Role,
                a.Task,
                a.Status,
                a.Notes
            })
            .OrderBy(x => x.Task).ThenBy(x => x.VolunteerName)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAssignment(Guid matchId, AssignmentRequest request, CancellationToken ct)
    {
        if (!await db.Matches.AnyAsync(x => x.Id == matchId, ct)) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        if (!await db.Volunteers.AnyAsync(x => x.Id == request.VolunteerId, ct))
            return BadRequest(new { message = "Volunteer does not exist." });

        var assignment = new MatchAssignment
        {
            MatchId = matchId,
            VolunteerId = request.VolunteerId,
            Task = request.Task.Trim(),
            Status = request.Status.Trim(),
            Notes = request.Notes?.Trim()
        };
        db.MatchAssignments.Add(assignment);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("CREATE", "MatchAssignment", assignment.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId, assignment.VolunteerId, assignment.Task, assignment.Status }, ct);
        return Created($"/api/admin/matches/{matchId}/assignments/{assignment.Id}", assignment);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAssignment(Guid matchId, Guid id, AssignmentRequest request, CancellationToken ct)
    {
        var assignment = await db.MatchAssignments.FirstOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (assignment is null) return NotFound();

        var error = Validate(request);
        if (error is not null) return BadRequest(new { message = error });

        if (!await db.Volunteers.AnyAsync(x => x.Id == request.VolunteerId, ct))
            return BadRequest(new { message = "Volunteer does not exist." });

        assignment.VolunteerId = request.VolunteerId;
        assignment.Task = request.Task.Trim();
        assignment.Status = request.Status.Trim();
        assignment.Notes = request.Notes?.Trim();
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("UPDATE", "MatchAssignment", assignment.Id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId, assignment.VolunteerId, assignment.Task, assignment.Status }, ct);
        return Ok(assignment);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAssignment(Guid matchId, Guid id, CancellationToken ct)
    {
        var assignment = await db.MatchAssignments.FirstOrDefaultAsync(x => x.Id == id && x.MatchId == matchId, ct);
        if (assignment is null) return NotFound();
        db.MatchAssignments.Remove(assignment);
        await db.SaveChangesAsync(ct);
        await audit.LogAsync("DELETE", "MatchAssignment", id.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(),
            new { matchId }, ct);
        return NoContent();
    }

    private static string? Validate(AssignmentRequest r)
    {
        if (r.VolunteerId == Guid.Empty) return "Volunteer is required.";
        if (string.IsNullOrWhiteSpace(r.Task)) return "Task is required.";
        if (!Statuses.Contains(r.Status)) return $"Status must be one of: {string.Join(", ", Statuses)}.";
        return null;
    }
}

public sealed record VolunteerRequest(
    string Name,
    string Role,
    string? Contact,
    bool ContactConsent = false,
    bool IsActive = true);

public sealed record AssignmentRequest(
    Guid VolunteerId,
    string Task,
    string Status,
    string? Notes);
