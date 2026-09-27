import 'json_utils.dart';

/// Team statistic of a match — maps `JSO.Domain.MatchStat`
/// (`GET /api/matches/{id}/stats`, ordered by name).
///
/// [homeValue] and [awayValue] belong to the home and away sides of the
/// fixture: JSO is the home side when `Match.isHome`, the opponent otherwise.
/// Either value may be missing.
class MatchStat {
  const MatchStat({
    required this.id,
    required this.matchId,
    required this.name,
    this.homeValue,
    this.awayValue,
  });

  final String id;
  final String matchId;
  final String name;
  final int? homeValue;
  final int? awayValue;

  /// The home side's share of `homeValue + awayValue`, from 0 to 1, counting a
  /// missing (or negative) value as 0. Null when there is nothing to compare:
  /// both values missing or zero.
  double? get homeShare {
    final home = _countable(homeValue);
    final total = home + _countable(awayValue);
    return total == 0 ? null : home / total;
  }

  factory MatchStat.fromJson(Map<String, dynamic> json) => MatchStat(
    id: asString(json['id']),
    matchId: asString(json['matchId']),
    name: asString(json['name']),
    homeValue: asIntOrNull(json['homeValue']),
    awayValue: asIntOrNull(json['awayValue']),
  );
}

int _countable(int? value) => (value == null || value < 0) ? 0 : value;
