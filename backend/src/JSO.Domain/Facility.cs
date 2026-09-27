namespace JSO.Domain;

// Facility booking and pitch maintenance (idea D15).
//
// A Facility is a bookable resource (a pitch/terrain, a room/salle, ...). Bookings
// reserve it for a time slot and the API rejects any overlap on the same facility.
// A maintenance log keeps the operational history (irrigation, mowing, repairs).
// No sensitive personal data is stored here: bookings only reference the admin who
// created them (BookedByAdminId), never a fan identity.
public sealed class Facility
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Required display name (e.g. "Terrain principal", "Salle de réunion").
    public string Name { get; set; } = null!;

    // Optional free-form category (Terrain / Salle / ...).
    public string? Type { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// A reservation of a facility for a time window. Overlap detection is enforced in
// the controller: a new/updated booking must not intersect an existing one on the
// same facility (StartsAt < existing.EndsAt && EndsAt > existing.StartsAt).
public sealed class FacilityBooking
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FacilityId { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }

    // Required purpose of the booking (e.g. "Entraînement U19", "Match amical").
    public string Purpose { get; set; } = null!;

    // The admin who created the booking, taken from the current user claim.
    // Nullable so the historical record survives if an admin is removed.
    public Guid? BookedByAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// A maintenance entry for a facility (idea D15): irrigation, mowing (tonte),
// repairs (réparation), etc. Kept as a simple dated history.
public sealed class MaintenanceLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FacilityId { get; set; }
    public DateOnly Date { get; set; }

    // Required maintenance type (Irrigation / Tonte / Réparation / ...).
    public string Type { get; set; } = null!;

    // Optional free-form notes.
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
