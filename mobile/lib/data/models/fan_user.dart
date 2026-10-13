import 'json_utils.dart';

/// Authenticated fan account — maps the API's account user payload.
///
/// The login/register response nests it as `{id, email, displayName}` (no
/// `emailVerified`, which defaults to `false`), while `GET /account/me` and
/// `PUT /account/me` return the richer
/// `{id, email, displayName, emailVerified, birthDate?, anniversaryOptIn,
/// memberSince?}` (idea A3). [FanUser.fromJson] tolerates every shape.
class FanUser {
  const FanUser({
    required this.id,
    required this.email,
    required this.displayName,
    this.firstName,
    this.lastName,
    this.phoneNumber,
    this.emailVerified = false,
    this.birthDate,
    this.anniversaryOptIn = false,
    this.memberSince,
  });

  final String id;
  final String email;
  final String displayName;
  final String? firstName;
  final String? lastName;
  final String? phoneNumber;
  final bool emailVerified;

  /// Optional birthday for older accounts; anniversary messaging is separate.
  /// The API serializes a `DateOnly` as `yyyy-MM-dd`.
  final DateTime? birthDate;

  /// Whether the fan opted in to birthday/anniversary messages.
  final bool anniversaryOptIn;

  /// Account creation date (`MemberSince`), when the API provides it.
  final DateTime? memberSince;

  factory FanUser.fromJson(Map<String, dynamic> json) => FanUser(
    id: asString(json['id']),
    email: asString(json['email']),
    displayName: asString(json['displayName']),
    firstName: json['firstName'] as String?,
    lastName: json['lastName'] as String?,
    phoneNumber: json['phoneNumber'] as String?,
    emailVerified: asBool(json['emailVerified']),
    birthDate: asDateTimeOrNull(json['birthDate']),
    anniversaryOptIn: asBool(json['anniversaryOptIn']),
    memberSince: asDateTimeOrNull(json['memberSince']),
  );
}
