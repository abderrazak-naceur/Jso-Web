using Microsoft.AspNetCore.Authorization;

namespace JSO.Api.Security;

public static class AdminAuthorizationExtensions
{
    public static void AddAdminPermissionPolicies(this AuthorizationOptions options)
    {
        foreach (var permission in AdminPermissions.All)
        {
            options.AddPolicy(permission, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context =>
                    AdminPermissionCatalog.HasPermission(context.User, permission));
            });
        }
    }
}
