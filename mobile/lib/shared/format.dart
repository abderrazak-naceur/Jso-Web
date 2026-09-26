import 'package:intl/intl.dart';

import '../data/models/match.dart';

/// Formatting helpers shared across screens.
class JsoFormat {
  const JsoFormat._();

  static final DateFormat _dateTime = DateFormat('EEE d MMM yyyy · HH:mm');
  static final DateFormat _date = DateFormat('d MMM yyyy');

  /// e.g. "Sun 15 Mar 2026 · 18:30" (local time).
  static String dateTime(DateTime value) => _dateTime.format(value.toLocal());

  /// e.g. "15 Mar 2026" (local time).
  static String date(DateTime value) => _date.format(value.toLocal());

  /// Home/away label from JSO's perspective.
  static String homeAway(Match match) => match.isHome ? 'Home' : 'Away';

  /// Fixture line, e.g. "JSO vs CS Sfaxien" or "CS Sfaxien vs JSO".
  static String fixture(Match match) => match.isHome
      ? 'JSO vs ${match.opponentName}'
      : '${match.opponentName} vs JSO';

  /// Score string when a result exists (JSO score first), otherwise the
  /// match status (e.g. "Scheduled").
  static String scoreOrStatus(Match match) {
    if (!match.hasResult) return match.status;
    final jso = match.isHome ? match.homeScore : match.awayScore;
    final opp = match.isHome ? match.awayScore : match.homeScore;
    return '$jso - $opp';
  }
}
