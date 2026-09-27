namespace JSO.Domain;

// A category of ticket sold for a given match (e.g. Tribune, Virage, VIP).
// Capacity caps how many can be sold; SoldCount tracks confirmed reservations
// so availability = Capacity - SoldCount. Kept in its own file to stay
// conflict-free from Entities.cs.
public sealed class TicketType
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TND";
    public int Capacity { get; set; }
    public int SoldCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
