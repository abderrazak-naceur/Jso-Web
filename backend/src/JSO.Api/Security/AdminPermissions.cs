using System.Security.Claims;

namespace JSO.Api.Security;

public static class AdminPermissions
{
    public const string DashboardView = "dashboard:view";
    public const string TicketsManage = "tickets:manage";
    public const string TicketsAdmin = "tickets:admin";
    public const string TicketsValidate = "tickets:validate";
    public const string TicketsCheckIn = "tickets:checkin";
    public const string TicketsReports = "tickets:reports";
    public const string MembershipsManage = "memberships:manage";
    public const string FinanceView = "finance:view";
    public const string DonationsCash = "donations:cash";
    public const string ShopManage = "shop:manage";
    public const string OrdersManage = "orders:manage";
    public const string MatchesManage = "matches:manage";
    public const string ContentNews = "content:news";
    public const string ContentMedia = "content:media";
    public const string ContentManage = "content:manage";
    public const string CommunityModerate = "community:moderate";
    public const string ClubManage = "club:manage";
    public const string SecurityManage = "security:manage";
    public const string SystemManage = "system:manage";

    public static readonly IReadOnlyList<string> All =
    [
        DashboardView, TicketsManage, TicketsAdmin, TicketsValidate, TicketsCheckIn, TicketsReports,
        MembershipsManage, FinanceView, DonationsCash, ShopManage, OrdersManage, MatchesManage,
        ContentNews, ContentMedia, ContentManage, CommunityModerate, ClubManage,
        SecurityManage, SystemManage
    ];
}

public static class AdminPermissionCatalog
{
    private static readonly IReadOnlyDictionary<string, string[]> RolePermissions =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["SuperAdmin"] = AdminPermissions.All.ToArray(),
            ["ClubAdmin"] =
            [
                AdminPermissions.DashboardView, AdminPermissions.TicketsManage, AdminPermissions.TicketsAdmin,
                AdminPermissions.TicketsValidate, AdminPermissions.TicketsCheckIn,
                AdminPermissions.TicketsReports, AdminPermissions.MembershipsManage,
                AdminPermissions.FinanceView, AdminPermissions.DonationsCash, AdminPermissions.ShopManage,
                AdminPermissions.OrdersManage, AdminPermissions.MatchesManage,
                AdminPermissions.ContentNews, AdminPermissions.ContentMedia,
                AdminPermissions.ContentManage, AdminPermissions.CommunityModerate,
                AdminPermissions.ClubManage, AdminPermissions.SystemManage
            ],
            ["MatchManager"] =
            [
                AdminPermissions.DashboardView, AdminPermissions.TicketsManage, AdminPermissions.TicketsAdmin,
                AdminPermissions.TicketsValidate, AdminPermissions.TicketsCheckIn,
                AdminPermissions.TicketsReports, AdminPermissions.MatchesManage
            ],
            ["FinanceManager"] = [AdminPermissions.DashboardView, AdminPermissions.FinanceView, AdminPermissions.DonationsCash],
            ["ShopManager"] = [AdminPermissions.DashboardView, AdminPermissions.ShopManage, AdminPermissions.OrdersManage, AdminPermissions.DonationsCash],
            ["Editor"] = [AdminPermissions.DashboardView, AdminPermissions.ContentNews, AdminPermissions.ContentMedia, AdminPermissions.ContentManage],
            ["CommunityManager"] = [AdminPermissions.DashboardView, AdminPermissions.CommunityModerate],
            ["TicketSeller"] = [AdminPermissions.DashboardView, AdminPermissions.TicketsManage, AdminPermissions.TicketsReports, AdminPermissions.DonationsCash],
            ["TicketValidator"] = [AdminPermissions.DashboardView, AdminPermissions.TicketsValidate, AdminPermissions.TicketsCheckIn],
            ["TicketSupervisor"] = [AdminPermissions.DashboardView, AdminPermissions.TicketsManage, AdminPermissions.TicketsAdmin, AdminPermissions.TicketsValidate, AdminPermissions.TicketsCheckIn, AdminPermissions.TicketsReports, AdminPermissions.DonationsCash],
            ["SeasonManager"] = [AdminPermissions.DashboardView, AdminPermissions.MembershipsManage, AdminPermissions.TicketsReports]
        };

    public static IReadOnlyList<string> GetPermissions(string role)
        => RolePermissions.TryGetValue(role, out var permissions)
            ? permissions
            : Array.Empty<string>();

    public static bool HasPermission(string role, string permission)
        => RolePermissions.TryGetValue(role, out var permissions)
            && permissions.Contains(permission, StringComparer.OrdinalIgnoreCase);

    public static bool HasPermission(ClaimsPrincipal user, string permission)
    {
        if (user.Identity?.IsAuthenticated != true)
            return false;

        var role = user.FindFirstValue(ClaimTypes.Role) ?? user.FindFirstValue("role");
        return role is not null && HasPermission(role, permission);
    }
}
