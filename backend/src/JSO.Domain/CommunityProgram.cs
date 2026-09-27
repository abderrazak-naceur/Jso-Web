namespace JSO.Domain;

// Community program with local schools and partner clubs/associations (idea G23).
// Represents a territorial initiative such as an open day or a neighbourhood
// tournament, run jointly with a partner (school, association, club).
//
// Privacy/GDPR: the only personal data held here is an optional partner contact
// e-mail, collected with the partner's consent for organisational purposes. It
// is NEVER exposed on the public read-only endpoint. No data about minors is
// stored here: any consent for initiatives involving children is handled on the
// school side, outside this system.
public sealed class CommunityProgram
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Initiative title (required).
    public string Title { get; set; } = null!;

    // Name of the partner school / association / club (required).
    public string PartnerName { get; set; } = null!;

    // Long-form description of the initiative.
    public string Description { get; set; } = null!;

    // When the initiative starts.
    public DateTimeOffset StartDate { get; set; }

    // Optional end date for multi-day / ongoing initiatives.
    public DateTimeOffset? EndDate { get; set; }

    // Optional partner contact e-mail, held with consent. Never exposed publicly.
    public string? ContactEmail { get; set; }

    // Only published programs are visible on the public endpoint. Defaults to
    // false so nothing leaks before an admin reviews it.
    public bool IsPublished { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
