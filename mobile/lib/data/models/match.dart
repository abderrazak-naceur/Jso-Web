import 'json_utils.dart';

/// Match entity — maps `JSO.Domain.Match`.
///
/// Note: the match-detail projection (`GET /api/matches/{id}`) omits
/// `isPublished`, so it is treated as optional here.
class Match {
  const Match({
    required this.id,
    required this.seasonId,
    required this.competitionId,
    required this.teamId,
    required this.opponentName,
    required this.kickoffAt,
    this.venue,
    required this.isHome,
    this.homeScore,
    this.awayScore,
    required this.status,
    this.isPublished,
  });

  final String id;
  final String seasonId;
  final String competitionId;
  final String teamId;
  final String opponentName;
  final DateTime kickoffAt;
  final String? venue;
  final bool isHome;
  final int? homeScore;
  final int? awayScore;
  final String status;
  final bool? isPublished;

  factory Match.fromJson(Map<String, dynamic> json) => Match(
    id: asString(json['id']),
    seasonId: asString(json['seasonId']),
    competitionId: asString(json['competitionId']),
    teamId: asString(json['teamId']),
    opponentName: asString(json['opponentName']),
    kickoffAt: asDateTime(json['kickoffAt']),
    venue: asStringOrNull(json['venue']),
    isHome: asBool(json['isHome']),
    homeScore: asIntOrNull(json['homeScore']),
    awayScore: asIntOrNull(json['awayScore']),
    status: asString(json['status'], fallback: 'Scheduled'),
    isPublished: json.containsKey('isPublished')
        ? asBool(json['isPublished'])
        : null,
  );

  /// Whether both scores are present (i.e. a result exists).
  bool get hasResult => homeScore != null && awayScore != null;
}
