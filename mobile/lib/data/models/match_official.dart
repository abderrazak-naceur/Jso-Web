import 'json_utils.dart';

/// Match official — maps `JSO.Domain.MatchOfficial`
/// (`GET /api/matches/{id}/officials`, ordered by role then name).
///
/// [role] is free text entered in the admin (server default `Referee`); the
/// match center translates the usual values to French.
class MatchOfficial {
  const MatchOfficial({
    required this.id,
    required this.matchId,
    required this.name,
    required this.role,
  });

  final String id;
  final String matchId;
  final String name;
  final String role;

  factory MatchOfficial.fromJson(Map<String, dynamic> json) => MatchOfficial(
    id: asString(json['id']),
    matchId: asString(json['matchId']),
    name: asString(json['name']),
    role: asStringOrNull(json['role']) ?? 'Referee',
  );
}
