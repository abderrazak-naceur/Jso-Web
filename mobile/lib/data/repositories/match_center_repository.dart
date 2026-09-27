import '../../core/api/api_client.dart';
import '../models/json_utils.dart';
import '../models/match_lineup_entry.dart';
import '../models/match_official.dart';
import '../models/match_reminder.dart';
import '../models/match_stat.dart';

/// Repository over the public match-center endpoints in
/// `backend/src/JSO.Api/Controllers/PublicMatchDetailsController.cs`.
///
/// All routes are anonymous and answer 404 ([NotFoundException]) when the
/// match is not published. Typed [ApiException]s from [ApiClient] propagate
/// to callers so each tab can render its own error state.
class MatchCenterRepository {
  MatchCenterRepository(this._client);

  final ApiClient _client;

  /// `GET /api/matches/{id}/lineup` — the match sheet, starters first then
  /// substitutes.
  Future<List<MatchLineupEntry>> getLineup(String matchId) async {
    final json = await _client.getJson(_path(matchId, 'lineup'));
    return asList(json, MatchLineupEntry.fromJson);
  }

  /// `GET /api/matches/{id}/officials` — referees, ordered by role then name.
  Future<List<MatchOfficial>> getOfficials(String matchId) async {
    final json = await _client.getJson(_path(matchId, 'officials'));
    return asList(json, MatchOfficial.fromJson);
  }

  /// `GET /api/matches/{id}/stats` — team statistics, ordered by name.
  Future<List<MatchStat>> getStats(String matchId) async {
    final json = await _client.getJson(_path(matchId, 'stats'));
    return asList(json, MatchStat.fromJson);
  }

  /// `GET /api/matches/{id}/reminder` — kickoff data plus the optional
  /// forecast (`weather` is null when unavailable).
  Future<MatchReminder> getReminder(String matchId) async {
    final json = await _client.getJson(_path(matchId, 'reminder'));
    return MatchReminder.fromJson(
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{},
    );
  }

  /// Encodes [matchId] so an unexpected value cannot alter the route.
  String _path(String matchId, String segment) =>
      '/matches/${Uri.encodeComponent(matchId)}/$segment';
}
