import 'json_utils.dart';

/// Authenticated administrator account — maps the admin login payload.
///
/// `POST /api/auth/login` answers `{accessToken, user:{id, email,
/// displayName, role}}`. Unlike [FanUser], an admin carries a [role]
/// (SuperAdmin, ClubAdmin, Editor, MatchManager, CommunityManager,
/// ShopManager) that gates the admin surface.
class AdminAccount {
  const AdminAccount({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
  });

  final String id;
  final String email;
  final String displayName;
  final String role;

  factory AdminAccount.fromJson(Map<String, dynamic> json) => AdminAccount(
    id: asString(json['id']),
    email: asString(json['email']),
    displayName: asString(json['displayName']),
    role: asString(json['role']),
  );
}
