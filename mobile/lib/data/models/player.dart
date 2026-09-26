import 'json_utils.dart';

/// Player — maps the public projection of `JSO.Domain.Player`
/// (`GET /api/teams/{id}/players`).
class Player {
  const Player({
    required this.id,
    required this.teamId,
    required this.firstName,
    required this.lastName,
    this.shirtNumber,
    this.position,
    this.photoUrl,
  });

  final String id;
  final String teamId;
  final String firstName;
  final String lastName;
  final int? shirtNumber;
  final String? position;
  final String? photoUrl;

  factory Player.fromJson(Map<String, dynamic> json) => Player(
    id: asString(json['id']),
    teamId: asString(json['teamId']),
    firstName: asString(json['firstName']),
    lastName: asString(json['lastName']),
    shirtNumber: asIntOrNull(json['shirtNumber']),
    position: asStringOrNull(json['position']),
    photoUrl: asStringOrNull(json['photoUrl']),
  );

  String get fullName => '$firstName $lastName'.trim();
}
