using JSO.Api.Security;
using JSO.Domain;

namespace JSO.Api.Tests;

public sealed class StaffAuthorizationServiceTests
{
    private readonly StaffAuthorizationService _service = new();

    private static AdminUser User(bool active = true) => new()
    {
        Id = Guid.NewGuid(),
        Email = "staff@jso.test",
        DisplayName = "Staff Test",
        PasswordHash = "test",
        Role = "TicketValidator",
        IsActive = active
    };

    private static StaffAssignment Assignment(
        Guid userId,
        string role = "TicketValidator",
        string scopeType = "Match",
        string? scopeId = null,
        string? gateId = null,
        string? deviceId = null,
        bool active = true,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null) => new()
    {
        AdminUserId = userId,
        Role = role,
        ScopeType = scopeType,
        ScopeId = scopeId,
        GateId = gateId,
        DeviceId = deviceId,
        IsActive = active,
        ValidFrom = from,
        ValidTo = to
    };

    [Fact]
    public void Allows_matching_match_gate_and_device()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), gateId: "GATE-01", deviceId: "SCANNER-01") };

        Assert.True(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString(), "GATE-01", "SCANNER-01"));
    }

    [Fact]
    public void Rejects_wrong_match()
    {
        var user = User();
        var assignments = new[] { Assignment(user.Id, scopeId: Guid.NewGuid().ToString()) };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", Guid.NewGuid().ToString()));
    }

    [Fact]
    public void Rejects_wrong_gate()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), gateId: "GATE-01") };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString(), "GATE-02"));
    }

    [Fact]
    public void Rejects_wrong_device()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), deviceId: "SCANNER-01") };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString(), deviceId: "SCANNER-99"));
    }

    [Fact]
    public void Rejects_expired_assignment()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), to: DateTimeOffset.UtcNow.AddMinutes(-1)) };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString()));
    }

    [Fact]
    public void Rejects_future_assignment()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), from: DateTimeOffset.UtcNow.AddMinutes(10)) };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString()));
    }

    [Fact]
    public void Rejects_inactive_assignment()
    {
        var user = User();
        var match = Guid.NewGuid();
        var assignments = new[] { Assignment(user.Id, scopeId: match.ToString(), active: false) };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", match.ToString()));
    }

    [Fact]
    public void Rejects_inactive_admin()
    {
        var user = User(false);
        var assignments = new[] { Assignment(user.Id, scopeId: Guid.NewGuid().ToString()) };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn));
    }

    [Fact]
    public void Rejects_role_without_permission()
    {
        var user = User();
        var assignments = new[] { Assignment(user.Id, role: "Editor", scopeType: "Global") };

        Assert.False(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn));
    }

    [Fact]
    public void Allows_global_assignment()
    {
        var user = User();
        var assignments = new[] { Assignment(user.Id, scopeType: "Global") };

        Assert.True(_service.CanAccess(user, assignments, AdminPermissions.TicketsCheckIn,
            "Match", Guid.NewGuid().ToString(), "GATE-99", "SCANNER-99"));
    }
}

public sealed class TicketScanEvaluatorTests
{
    [Fact]
    public void Returns_valid_for_confirmed_ticket_on_correct_match()
    {
        var matchId = Guid.NewGuid();
        var order = new TicketOrder { MatchId = matchId, Status = "Confirmed" };

        var result = TicketScanEvaluator.Evaluate(order, matchId);

        Assert.Equal("Valid", result.Result);
    }

    [Fact]
    public void Returns_wrong_match_before_ticket_status()
    {
        var order = new TicketOrder { MatchId = Guid.NewGuid(), Status = "CheckedIn" };

        var result = TicketScanEvaluator.Evaluate(order, Guid.NewGuid());

        Assert.Equal("WrongMatch", result.Result);
    }

    [Fact]
    public void Returns_already_used_for_checked_in_ticket_on_correct_match()
    {
        var matchId = Guid.NewGuid();
        var order = new TicketOrder { MatchId = matchId, Status = "CheckedIn" };

        var result = TicketScanEvaluator.Evaluate(order, matchId);

        Assert.Equal("AlreadyUsed", result.Result);
    }

    [Fact]
    public void Returns_cancelled_for_cancelled_ticket()
    {
        var matchId = Guid.NewGuid();
        var order = new TicketOrder { MatchId = matchId, Status = "Cancelled" };

        var result = TicketScanEvaluator.Evaluate(order, matchId);

        Assert.Equal("Cancelled", result.Result);
    }

    [Fact]
    public void Returns_invalid_for_missing_ticket()
    {
        var result = TicketScanEvaluator.Evaluate(null, Guid.NewGuid());

        Assert.Equal("Invalid", result.Result);
    }
}
