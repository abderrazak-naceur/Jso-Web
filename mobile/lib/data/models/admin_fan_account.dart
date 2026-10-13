import 'json_utils.dart';

/// Supporter account returned by GET /api/admin/fan-accounts.
class AdminFanAccount {
  const AdminFanAccount({
    required this.id,
    required this.email,
    required this.displayName,
    required this.isActive,
    required this.fanRatingStars,
    required this.isVip,
    this.profilePhotoUrl,
    this.emailVerified = false,
    this.createdAt,
    this.lastLoginAt,
  });

  final String id;
  final String email;
  final String displayName;
  final bool isActive;
  final int fanRatingStars;
  final bool isVip;
  final String? profilePhotoUrl;
  final bool emailVerified;
  final DateTime? createdAt;
  final DateTime? lastLoginAt;

  factory AdminFanAccount.fromJson(Map<String, dynamic> json) {
    DateTime? date(Object? value) =>
        value is String ? DateTime.tryParse(value) : null;
    final rawStars = json['fanRatingStars'];
    final stars = rawStars is int ? rawStars : int.tryParse('$rawStars') ?? 1;
    return AdminFanAccount(
      id: asString(json['id']),
      email: asString(json['email']),
      displayName: asString(json['displayName']),
      isActive: json['isActive'] == true,
      fanRatingStars: const {1, 3, 5}.contains(stars) ? stars : 1,
      isVip: json['isVip'] == true,
      profilePhotoUrl: json['profilePhotoUrl']?.toString(),
      emailVerified: json['emailVerified'] == true,
      createdAt: date(json['createdAt']),
      lastLoginAt: date(json['lastLoginAt']),
    );
  }

  AdminFanAccount copyWith({
    bool? isActive,
    int? fanRatingStars,
    bool? isVip,
  }) => AdminFanAccount(
    id: id,
    email: email,
    displayName: displayName,
    isActive: isActive ?? this.isActive,
    fanRatingStars: fanRatingStars ?? this.fanRatingStars,
    isVip: isVip ?? this.isVip,
    profilePhotoUrl: profilePhotoUrl,
    emailVerified: emailVerified,
    createdAt: createdAt,
    lastLoginAt: lastLoginAt,
  );
}
