namespace JSO.Domain;

public sealed class FundraisingProject
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal BudgetTnd { get; set; }
    public int DurationMonths { get; set; } = 10;
    public string TemplateId { get; set; } = "bus";
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = "Draft";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class FundraisingCommitment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProjectId { get; set; }
    public Guid? FanUserId { get; set; }
    public string DisplayName { get; set; } = "";
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public decimal MonthlyAmountTnd { get; set; }
    public int Months { get; set; } = 10;
    public string PaymentMethod { get; set; } = "Cash";
    public string AccessTokenHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public static class FundraisingRules
{
    public static readonly decimal[] MonthlyAmounts = [5m, 10m, 20m, 30m, 50m];
    public static readonly string[] Templates = ["bus", "equipment", "travel", "facilities", "custom"];

    public static string? ValidateProject(FundraisingProject project) =>
        string.IsNullOrWhiteSpace(project.Title) || project.Title.Length > 160 ? "Le titre est requis (160 caractères maximum)." :
        string.IsNullOrWhiteSpace(project.Description) || project.Description.Length > 6000 ? "La description est requise (6 000 caractères maximum)." :
        project.BudgetTnd is < 1m or > 10_000_000m ? "Le budget doit être compris entre 1 et 10 000 000 TND." :
        project.DurationMonths != 10 ? "Le plan de soutien comprend 10 mois." :
        !Templates.Contains(project.TemplateId) ? "Choisissez un modèle disponible." :
        project.Status is not ("Draft" or "Published" or "Archived") ? "Le statut doit être brouillon, publié ou archivé." : null;

    public static List<SupporterBrick> CreateInstallments(FundraisingCommitment commitment)
    {
        if (!MonthlyAmounts.Contains(commitment.MonthlyAmountTnd) || commitment.Months != 10)
            throw new ArgumentException("Le plan doit comprendre 10 mensualités de 5, 10, 20, 30 ou 50 TND.");
        return Enumerable.Range(1, commitment.Months).Select(month => new SupporterBrick
        {
            FundraisingProjectId = commitment.ProjectId,
            FundraisingCommitmentId = commitment.Id,
            InstallmentNumber = month,
            FanUserId = commitment.FanUserId,
            DisplayName = commitment.DisplayName,
            DonorPhone = commitment.Phone,
            Amount = commitment.MonthlyAmountTnd,
            Status = "Donation",
            PaymentStatus = "Pending",
            PaymentProvider = commitment.PaymentMethod == "Cash" ? "Cash" : null,
            Country = commitment.PaymentMethod == "Cash" ? "TN" : null,
            CreatedAt = commitment.CreatedAt
        }).ToList();
    }
}
