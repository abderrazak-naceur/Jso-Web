import 'json_utils.dart';

/// Team — maps the public projection of `JSO.Domain.Team`
/// (`GET /api/teams`: id, name, category, isActive, playersCount).
class Team {
  const Team({
    required this.id,
    required this.name,
    required this.category,
    required this.isActive,
    required this.playersCount,
  });

  final String id;
  final String name;
  final String category;
  final bool isActive;
  final int playersCount;

  factory Team.fromJson(Map<String, dynamic> json) => Team(
    id: asString(json['id']),
    name: asString(json['name']),
    category: asString(json['category']),
    isActive: asBool(json['isActive'], fallback: true),
    playersCount: asInt(json['playersCount']),
  );
}
