import 'json_utils.dart';

/// One player of a match sheet — maps an item of
/// `GET /api/matches/{id}/lineup` (a `JSO.Domain.MatchLineup` joined with its
/// `Player`).
///
/// Identity and shirt number come from the roster ([playerPosition] is the
/// player's usual position), while [role], [positionOrder], [position],
/// [isCaptain] and [isSubstitute] are specific to this match. The server
/// orders the list starters first, then substitutes, each group by
/// [positionOrder] then last name.
class MatchLineupEntry {
  const MatchLineupEntry({
    required this.id,
    required this.playerId,
    required this.firstName,
    required this.lastName,
    this.shirtNumber,
    this.playerPosition,
    required this.role,
    this.positionOrder,
    this.position,
    required this.isCaptain,
    required this.isSubstitute,
  });

  final String id;
  final String playerId;
  final String firstName;
  final String lastName;
  final int? shirtNumber;

  /// The player's usual position on the roster.
  final String? playerPosition;

  /// `Starter` or `Substitute` (server default `Starter`).
  final String role;
  final int? positionOrder;

  /// The position set for this match, when the staff entered one.
  final String? position;
  final bool isCaptain;
  final bool isSubstitute;

  String get fullName => '$firstName $lastName'.trim();

  /// Position to display: the one set for this match, else the usual one.
  String? get displayPosition =>
      _nonBlank(position) ?? _nonBlank(playerPosition);

  factory MatchLineupEntry.fromJson(Map<String, dynamic> json) {
    final role = asStringOrNull(json['role']) ?? 'Starter';
    return MatchLineupEntry(
      id: asString(json['id']),
      playerId: asString(json['playerId']),
      firstName: asString(json['firstName']),
      lastName: asString(json['lastName']),
      shirtNumber: asIntOrNull(json['shirtNumber']),
      playerPosition: asStringOrNull(json['playerPosition']),
      role: role,
      positionOrder: asIntOrNull(json['positionOrder']),
      position: asStringOrNull(json['position']),
      isCaptain: asBool(json['isCaptain']),
      // The server derives the flag from the role; fall back to it when the
      // flag is missing.
      isSubstitute: asBool(
        json['isSubstitute'],
        fallback: role == 'Substitute',
      ),
    );
  }
}

String? _nonBlank(String? value) {
  final trimmed = value?.trim();
  return (trimmed == null || trimmed.isEmpty) ? null : trimmed;
}
