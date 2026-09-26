import 'json_utils.dart';

/// Match event — maps `JSO.Domain.MatchEvent`.
class MatchEvent {
  const MatchEvent({
    required this.id,
    required this.matchId,
    required this.minute,
    required this.type,
    this.playerName,
    this.notes,
  });

  final String id;
  final String matchId;
  final int minute;
  final String type;
  final String? playerName;
  final String? notes;

  factory MatchEvent.fromJson(Map<String, dynamic> json) => MatchEvent(
    id: asString(json['id']),
    matchId: asString(json['matchId']),
    minute: asInt(json['minute']),
    type: asString(json['type']),
    playerName: asStringOrNull(json['playerName']),
    notes: asStringOrNull(json['notes']),
  );
}
