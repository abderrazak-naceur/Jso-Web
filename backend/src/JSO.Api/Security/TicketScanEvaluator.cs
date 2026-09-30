using JSO.Domain;

namespace JSO.Api.Security;

public static class TicketScanEvaluator
{
    public static (string Result, string Message) Evaluate(TicketOrder? order, Guid? matchId)
    {
        if (order is null) return ("Invalid", "Billet introuvable.");
        if (matchId is not null && matchId != order.MatchId)
            return ("WrongMatch", "Billet pour un altro match.");
        if (order.Status == "CheckedIn") return ("AlreadyUsed", "Billet déjà utilisé.");
        if (order.Status == "Cancelled") return ("Cancelled", "Billet annulé.");
        if (order.Status != "Confirmed") return ("Invalid", "Billet non valide.");
        return ("Valid", "Billet valide.");
    }
}
