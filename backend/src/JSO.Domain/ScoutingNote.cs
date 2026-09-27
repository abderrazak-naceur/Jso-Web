namespace JSO.Domain;

// Scouting note on an opposing team or an observed player (idea C9).
// Internal technical-staff tool only: every route is restricted to the
// MatchManager / ClubAdmin roles, writes are audited and nothing is ever
// exposed on a public endpoint. When a note concerns youth-sector minors the
// same role restriction guarantees a limited audience.
public sealed class ScoutingNote
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Free-text subject: opponent team name or observed player name.
    public string Subject { get; set; } = null!;

    // Discriminator: "Opponent" or "Player".
    public string SubjectType { get; set; } = "Opponent";

    // Optional link to a match the observation refers to.
    public Guid? MatchId { get; set; }

    // Optional 1..5 evaluation.
    public int? Rating { get; set; }

    // Free-text body of the note.
    public string? Body { get; set; }

    // Admin who authored the note (claim of the current user).
    public string? AuthorAdminId { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
