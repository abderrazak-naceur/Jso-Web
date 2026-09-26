import 'json_utils.dart';

/// Authenticated fan account — maps the API's account user payload.
///
/// The login/register response nests it as `{id, email, displayName}` (no
/// `emailVerified`, which defaults to `false`), while `GET /account/me`
/// returns `{id, email, displayName, emailVerified}`. [FanUser.fromJson]
/// tolerates both shapes.
class FanUser {
  const FanUser({
    required this.id,
    required this.email,
    required this.displayName,
    this.emailVerified = false,
  });

  final String id;
  final String email;
  final String displayName;
  final bool emailVerified;

  factory FanUser.fromJson(Map<String, dynamic> json) => FanUser(
    id: asString(json['id']),
    email: asString(json['email']),
    displayName: asString(json['displayName']),
    emailVerified: asBool(json['emailVerified']),
  );
}
