import 'package:intl/intl.dart';

import '../data/models/match.dart';

/// Formatting helpers shared across screens (French UI copy).
///
/// Day and month names are spelled out here rather than through intl's locale
/// data: `DateFormat('…', 'fr')` needs an async `initializeDateFormatting`
/// call at startup (and in every test), while these fixed French labels keep
/// formatting synchronous and deterministic. Times still use intl's
/// locale-independent `HH:mm` pattern.
class JsoFormat {
  const JsoFormat._();

  static final DateFormat _time = DateFormat('HH:mm');

  static const List<String> _days = [
    'lun.',
    'mar.',
    'mer.',
    'jeu.',
    'ven.',
    'sam.',
    'dim.',
  ];

  static const List<String> _months = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];

  /// e.g. "dim. 15 mars 2026 · 18:30" (local time).
  static String dateTime(DateTime value) {
    final local = value.toLocal();
    return '${_days[local.weekday - 1]} ${date(local)} · ${time(local)}';
  }

  /// e.g. "15 mars 2026" (local time).
  static String date(DateTime value) {
    final local = value.toLocal();
    return '${local.day} ${_months[local.month - 1]} ${local.year}';
  }

  /// e.g. "18:30" (local time).
  static String time(DateTime value) => _time.format(value.toLocal());

  /// A start/end span for events and programmes (local time):
  /// - no end: "15 mars 2026 · 18:30"
  /// - same day: "15 mars 2026 · 18:30 – 20:00"
  /// - several days: "15 mars 2026 – 17 mars 2026"
  static String dateRange(DateTime start, DateTime? end) {
    if (end == null) return '${date(start)} · ${time(start)}';
    final s = start.toLocal();
    final e = end.toLocal();
    final sameDay = s.year == e.year && s.month == e.month && s.day == e.day;
    if (sameDay) return '${date(s)} · ${time(s)} – ${time(e)}';
    return '${date(s)} – ${date(e)}';
  }

  /// Home/away label from JSO's perspective.
  static String homeAway(Match match) =>
      match.isHome ? 'Domicile' : 'Extérieur';

  /// French label for a backend match status (`Scheduled`, `Live`,
  /// `Finished`...). Unknown values are returned unchanged so a new server
  /// status still renders.
  static String matchStatus(String status) {
    return switch (status) {
      'Scheduled' => 'À venir',
      'Live' => 'En direct',
      'HalfTime' => 'Mi-temps',
      'Finished' => 'Terminé',
      'Postponed' => 'Reporté',
      'Cancelled' => 'Annulé',
      _ => status,
    };
  }

  /// Fixture line, e.g. "JSO vs CS Sfaxien" or "CS Sfaxien vs JSO".
  static String fixture(Match match) => match.isHome
      ? 'JSO vs ${match.opponentName}'
      : '${match.opponentName} vs JSO';

  /// Score string when a result exists (JSO score first), otherwise the
  /// French match status (e.g. "À venir").
  static String scoreOrStatus(Match match) {
    if (!match.hasResult) return matchStatus(match.status);
    final jso = match.isHome ? match.homeScore : match.awayScore;
    final opp = match.isHome ? match.awayScore : match.homeScore;
    return '$jso - $opp';
  }

  /// Money with the currency code as a suffix, e.g. "25.00 TND".
  ///
  /// JSO prices are stored in TND and the API returns the currency code, so a
  /// simple "amount code" format matches the club convention without pulling
  /// locale-specific currency symbols.
  static String money(double amount, String currency) =>
      '${amount.toStringAsFixed(2)} $currency';
}
