import 'json_utils.dart';

/// Live blog entry — maps an item from `GET /api/matches/{id}/liveblog`.
///
/// The feed is ordered server-side (pinned first, then most recent by
/// `createdAt`). [minute] is nullable and [kind] tolerates unknown values so
/// new server kinds do not break parsing.
class LiveBlogEntry {
  const LiveBlogEntry({
    required this.id,
    required this.matchId,
    required this.minute,
    required this.kind,
    required this.body,
    required this.createdAt,
    required this.isPinned,
  });

  final String id;
  final String matchId;
  final int? minute;
  final String kind;
  final String body;
  final DateTime createdAt;
  final bool isPinned;

  factory LiveBlogEntry.fromJson(Map<String, dynamic> json) => LiveBlogEntry(
    id: asString(json['id']),
    matchId: asString(json['matchId']),
    minute: asIntOrNull(json['minute']),
    kind: asString(json['kind']),
    body: asString(json['body']),
    createdAt: asDateTime(json['createdAt']),
    isPinned: asBool(json['isPinned']),
  );
}
