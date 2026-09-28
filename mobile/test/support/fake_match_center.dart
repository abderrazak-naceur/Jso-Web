import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/match_lineup_entry.dart';
import 'package:jso_mobile/data/models/match_official.dart';
import 'package:jso_mobile/data/models/match_reminder.dart';
import 'package:jso_mobile/data/models/match_stat.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';

/// Test double for match-center endpoints that never touches the network.
class FakeMatchCenterRepository extends MatchCenterRepository {
  FakeMatchCenterRepository({
    this.lineup,
    this.officials,
    this.stats,
    this.reminder,
    this.error,
    this.reminderError,
    this.delay,
  }) : super(ApiClient());

  final List<MatchLineupEntry>? lineup;
  final List<MatchOfficial>? officials;
  final List<MatchStat>? stats;
  final MatchReminder? reminder;
  final ApiException? error;
  final ApiException? reminderError;
  final Duration? delay;

  int reminderCallCount = 0;

  Future<T> _resolve<T>(T Function() value) async {
    if (delay != null) await Future<void>.delayed(delay!);
    if (error != null) throw error!;
    return value();
  }

  @override
  Future<List<MatchLineupEntry>> getLineup(String matchId) =>
      _resolve(() => lineup ?? const []);

  @override
  Future<List<MatchOfficial>> getOfficials(String matchId) =>
      _resolve(() => officials ?? const []);

  @override
  Future<List<MatchStat>> getStats(String matchId) =>
      _resolve(() => stats ?? const []);

  @override
  Future<MatchReminder> getReminder(String matchId) async {
    reminderCallCount++;
    if (delay != null) await Future<void>.delayed(delay!);
    if (reminderError != null) throw reminderError!;
    if (error != null) throw error!;
    return reminder!;
  }
}
