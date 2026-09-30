using JSO.Domain;

namespace JSO.Api.Security;

public sealed class StaffAuthorizationService
{
    public bool CanAccess(
        AdminUser user,
        IEnumerable<StaffAssignment> assignments,
        string permission,
        string? scopeType = null,
        string? scopeId = null,
        string? gateId = null,
        string? deviceId = null,
        DateTimeOffset? at = null)
    {
        if (!user.IsActive || !AdminPermissionCatalog.HasPermission(
                new System.Security.Claims.ClaimsPrincipal(
                    new System.Security.Claims.ClaimsIdentity(
                    [
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, user.Role)
                    ])),
                permission))
            return false;

        var now = at ?? DateTimeOffset.UtcNow;

        return assignments.Any(x =>
            x.AdminUserId == user.Id &&
            x.IsActive &&
            (x.ValidFrom is null || x.ValidFrom <= now) &&
            (x.ValidTo is null || x.ValidTo >= now) &&
            ScopeMatches(x, scopeType, scopeId, gateId, deviceId));
    }

    private static bool ScopeMatches(
        StaffAssignment assignment,
        string? scopeType,
        string? scopeId,
        string? gateId,
        string? deviceId)
    {
        if (assignment.ScopeType.Equals("Global", StringComparison.OrdinalIgnoreCase))
            return true;

        if (!string.Equals(assignment.ScopeType, scopeType, StringComparison.OrdinalIgnoreCase))
            return false;

        if (!string.IsNullOrWhiteSpace(assignment.ScopeId) &&
            !string.Equals(assignment.ScopeId, scopeId, StringComparison.OrdinalIgnoreCase))
            return false;

        if (!string.IsNullOrWhiteSpace(assignment.GateId) &&
            !string.Equals(assignment.GateId, gateId, StringComparison.OrdinalIgnoreCase))
            return false;

        if (!string.IsNullOrWhiteSpace(assignment.DeviceId) &&
            !string.Equals(assignment.DeviceId, deviceId, StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }
}
