using JSO.Domain;
using JSO.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JSO.Api.Controllers;

// Facility booking & pitch maintenance (idea D15). Admin only (ClubAdmin /
// MatchManager), every write audited, no public endpoint and no sensitive
// personal data. Three areas share this controller:
//   - CRUD facilities:        /api/admin/facilities
//   - Bookings per facility:  /api/admin/facilities/{id}/bookings  (overlap-checked)
//   - Maintenance log:        /api/admin/facilities/{id}/maintenance
[ApiController]
[Authorize(Roles = "ClubAdmin,MatchManager")]
[Route("api/admin/facilities")]
public sealed class AdminFacilitiesController(JsoDbContext db, AuditService audit) : ControllerBase
{
    // ---- Facilities CRUD -------------------------------------------------

    [HttpGet]
    public async Task<IActionResult> GetFacilities(CancellationToken ct) =>
        Ok(await db.Facilities.AsNoTracking()
            .OrderByDescending(x => x.IsActive).ThenBy(x => x.Name)
            .ToListAsync(ct));

    [HttpPost]
    public async Task<IActionResult> CreateFacility(FacilityRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required." });

        var facility = new Facility
        {
            Name = request.Name.Trim(),
            Type = string.IsNullOrWhiteSpace(request.Type) ? null : request.Type.Trim(),
            IsActive = request.IsActive
        };
        db.Facilities.Add(facility);
        await db.SaveChangesAsync(ct);
        await Log("CREATE", "Facility", facility.Id, new { facility.Name, facility.Type, facility.IsActive }, ct);
        return Created($"/api/admin/facilities/{facility.Id}", facility);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateFacility(Guid id, FacilityRequest request, CancellationToken ct)
    {
        var facility = await db.Facilities.FindAsync([id], ct);
        if (facility is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest(new { message = "Name is required." });

        facility.Name = request.Name.Trim();
        facility.Type = string.IsNullOrWhiteSpace(request.Type) ? null : request.Type.Trim();
        facility.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await Log("UPDATE", "Facility", facility.Id, new { facility.Name, facility.Type, facility.IsActive }, ct);
        return Ok(facility);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFacility(Guid id, CancellationToken ct)
    {
        var facility = await db.Facilities.FindAsync([id], ct);
        if (facility is null) return NotFound();

        // Cascade the operational history so no orphan bookings/logs remain.
        var bookings = db.FacilityBookings.Where(x => x.FacilityId == id);
        var logs = db.MaintenanceLogs.Where(x => x.FacilityId == id);
        db.FacilityBookings.RemoveRange(bookings);
        db.MaintenanceLogs.RemoveRange(logs);
        db.Facilities.Remove(facility);
        await db.SaveChangesAsync(ct);
        await Log("DELETE", "Facility", id, null, ct);
        return NoContent();
    }

    // ---- Bookings --------------------------------------------------------

    // Lists bookings for a facility, optionally filtered by [from, to) overlap.
    [HttpGet("{id:guid}/bookings")]
    public async Task<IActionResult> GetBookings(Guid id, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to, CancellationToken ct)
    {
        if (!await db.Facilities.AnyAsync(x => x.Id == id, ct)) return NotFound();

        var query = db.FacilityBookings.AsNoTracking().Where(x => x.FacilityId == id);
        // Interval overlap with the requested window (half-open intervals).
        if (from is { } f) query = query.Where(x => x.EndsAt > f);
        if (to is { } t) query = query.Where(x => x.StartsAt < t);

        var rows = await query
            .GroupJoin(db.AdminUsers.AsNoTracking(), b => b.BookedByAdminId, a => (Guid?)a.Id, (b, a) => new { b, a })
            .SelectMany(x => x.a.DefaultIfEmpty(), (x, a) => new
            {
                x.b.Id,
                x.b.FacilityId,
                x.b.StartsAt,
                x.b.EndsAt,
                x.b.Purpose,
                x.b.BookedByAdminId,
                BookedByName = a != null ? a.DisplayName : null,
                x.b.CreatedAt
            })
            .OrderBy(x => x.StartsAt)
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("{id:guid}/bookings")]
    public async Task<IActionResult> CreateBooking(Guid id, BookingRequest request, CancellationToken ct)
    {
        if (!await db.Facilities.AnyAsync(x => x.Id == id, ct)) return NotFound();

        var error = ValidateBooking(request);
        if (error is not null) return BadRequest(new { message = error });

        if (await HasOverlap(id, request.StartsAt, request.EndsAt, null, ct))
            return Conflict(new { message = "Ce créneau chevauche une réservation existante pour cette installation." });

        var booking = new FacilityBooking
        {
            FacilityId = id,
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            Purpose = request.Purpose.Trim(),
            BookedByAdminId = CurrentAdminId()
        };
        db.FacilityBookings.Add(booking);
        await db.SaveChangesAsync(ct);
        await Log("CREATE", "FacilityBooking", booking.Id, new { id, booking.StartsAt, booking.EndsAt, booking.Purpose }, ct);
        return Created($"/api/admin/facilities/{id}/bookings/{booking.Id}", booking);
    }

    [HttpPut("{id:guid}/bookings/{bookingId:guid}")]
    public async Task<IActionResult> UpdateBooking(Guid id, Guid bookingId, BookingRequest request, CancellationToken ct)
    {
        var booking = await db.FacilityBookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.FacilityId == id, ct);
        if (booking is null) return NotFound();

        var error = ValidateBooking(request);
        if (error is not null) return BadRequest(new { message = error });

        if (await HasOverlap(id, request.StartsAt, request.EndsAt, bookingId, ct))
            return Conflict(new { message = "Ce créneau chevauche une réservation existante pour cette installation." });

        booking.StartsAt = request.StartsAt;
        booking.EndsAt = request.EndsAt;
        booking.Purpose = request.Purpose.Trim();
        await db.SaveChangesAsync(ct);
        await Log("UPDATE", "FacilityBooking", booking.Id, new { id, booking.StartsAt, booking.EndsAt, booking.Purpose }, ct);
        return Ok(booking);
    }

    [HttpDelete("{id:guid}/bookings/{bookingId:guid}")]
    public async Task<IActionResult> DeleteBooking(Guid id, Guid bookingId, CancellationToken ct)
    {
        var booking = await db.FacilityBookings.FirstOrDefaultAsync(x => x.Id == bookingId && x.FacilityId == id, ct);
        if (booking is null) return NotFound();
        db.FacilityBookings.Remove(booking);
        await db.SaveChangesAsync(ct);
        await Log("DELETE", "FacilityBooking", bookingId, new { id }, ct);
        return NoContent();
    }

    // ---- Maintenance log -------------------------------------------------

    [HttpGet("{id:guid}/maintenance")]
    public async Task<IActionResult> GetMaintenance(Guid id, CancellationToken ct)
    {
        if (!await db.Facilities.AnyAsync(x => x.Id == id, ct)) return NotFound();
        return Ok(await db.MaintenanceLogs.AsNoTracking()
            .Where(x => x.FacilityId == id)
            .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt)
            .ToListAsync(ct));
    }

    [HttpPost("{id:guid}/maintenance")]
    public async Task<IActionResult> CreateMaintenance(Guid id, MaintenanceRequest request, CancellationToken ct)
    {
        if (!await db.Facilities.AnyAsync(x => x.Id == id, ct)) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Type)) return BadRequest(new { message = "Type is required." });

        var log = new MaintenanceLog
        {
            FacilityId = id,
            Date = request.Date,
            Type = request.Type.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
        };
        db.MaintenanceLogs.Add(log);
        await db.SaveChangesAsync(ct);
        await Log("CREATE", "MaintenanceLog", log.Id, new { id, log.Date, log.Type }, ct);
        return Created($"/api/admin/facilities/{id}/maintenance/{log.Id}", log);
    }

    [HttpPut("{id:guid}/maintenance/{logId:guid}")]
    public async Task<IActionResult> UpdateMaintenance(Guid id, Guid logId, MaintenanceRequest request, CancellationToken ct)
    {
        var log = await db.MaintenanceLogs.FirstOrDefaultAsync(x => x.Id == logId && x.FacilityId == id, ct);
        if (log is null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Type)) return BadRequest(new { message = "Type is required." });

        log.Date = request.Date;
        log.Type = request.Type.Trim();
        log.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        await db.SaveChangesAsync(ct);
        await Log("UPDATE", "MaintenanceLog", log.Id, new { id, log.Date, log.Type }, ct);
        return Ok(log);
    }

    [HttpDelete("{id:guid}/maintenance/{logId:guid}")]
    public async Task<IActionResult> DeleteMaintenance(Guid id, Guid logId, CancellationToken ct)
    {
        var log = await db.MaintenanceLogs.FirstOrDefaultAsync(x => x.Id == logId && x.FacilityId == id, ct);
        if (log is null) return NotFound();
        db.MaintenanceLogs.Remove(log);
        await db.SaveChangesAsync(ct);
        await Log("DELETE", "MaintenanceLog", logId, new { id }, ct);
        return NoContent();
    }

    // ---- Helpers ---------------------------------------------------------

    private static string? ValidateBooking(BookingRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Purpose)) return "Purpose is required.";
        if (r.EndsAt <= r.StartsAt) return "EndsAt must be after StartsAt.";
        return null;
    }

    // Two half-open intervals overlap when StartsAt < existing.EndsAt && EndsAt > existing.StartsAt.
    // The optional excludeId skips the booking being updated so it never conflicts with itself.
    private Task<bool> HasOverlap(Guid facilityId, DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? excludeId, CancellationToken ct) =>
        db.FacilityBookings.AnyAsync(x =>
            x.FacilityId == facilityId &&
            (excludeId == null || x.Id != excludeId) &&
            startsAt < x.EndsAt && endsAt > x.StartsAt, ct);

    // The JWT carries the admin id in "sub", remapped to NameIdentifier by ASP.NET.
    private Guid? CurrentAdminId()
    {
        var sub = User.FindFirst("sub")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private Task Log(string action, string entityType, Guid entityId, object? details, CancellationToken ct) =>
        audit.LogAsync(action, entityType, entityId.ToString(), User.FindFirst("sub")?.Value,
            User.FindFirst("email")?.Value, HttpContext.Connection.RemoteIpAddress?.ToString(), details, ct);
}

public sealed record FacilityRequest(
    string Name,
    string? Type = null,
    bool IsActive = true);

public sealed record BookingRequest(
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string Purpose);

public sealed record MaintenanceRequest(
    DateOnly Date,
    string Type,
    string? Notes = null);
