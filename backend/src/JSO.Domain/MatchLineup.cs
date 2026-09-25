namespace JSO.Domain;

public sealed class MatchLineup
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public Guid PlayerId { get; set; }
    public string Role { get; set; } = "Starter";
    public int? PositionOrder { get; set; }
    public string? Position { get; set; }
    public bool IsCaptain { get; set; }
    public bool IsSubstitute { get; set; }
}

public sealed class MatchOfficial
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public string Name { get; set; } = null!;
    public string Role { get; set; } = "Referee";
}

public sealed class MatchStat
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MatchId { get; set; }
    public string Name { get; set; } = null!;
    public int? HomeValue { get; set; }
    public int? AwayValue { get; set; }
}
