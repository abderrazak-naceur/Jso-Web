import 'json_utils.dart';

/// Club event (assemblée, entraînement ouvert, fête...) — maps the public
/// projection of `JSO.Domain.ClubEvent` returned by `GET /api/events` and
/// `GET /api/events/{slug}`: id, title, slug, description, startAt, endAt,
/// location.
///
/// Only published events reach the app. [startAt] / [endAt] are
/// `DateTimeOffset` server-side (parsed as UTC instants here). [endAt],
/// [description] and [location] are optional; blank strings are normalised to
/// null so the UI only has to test for null.
class ClubEvent {
  const ClubEvent({
    required this.id,
    required this.title,
    required this.slug,
    required this.startAt,
    this.endAt,
    this.description,
    this.location,
  });

  final String id;
  final String title;
  final String slug;
  final DateTime startAt;
  final DateTime? endAt;
  final String? description;
  final String? location;

  /// When the event is over: [endAt] when set, otherwise [startAt].
  DateTime get endsAt => endAt ?? startAt;

  /// Whether the event is still to come — or in progress — at [now].
  bool isUpcomingAt(DateTime now) => endsAt.isAfter(now);

  factory ClubEvent.fromJson(Map<String, dynamic> json) => ClubEvent(
    id: asString(json['id']),
    title: asString(json['title']),
    slug: asString(json['slug']),
    startAt: asDateTime(json['startAt']),
    endAt: asDateTimeOrNull(json['endAt']),
    description: _textOrNull(json['description']),
    location: _textOrNull(json['location']),
  );
}

/// Trimmed text, or null when the value is missing or blank.
String? _textOrNull(Object? value) {
  final text = asString(value).trim();
  return text.isEmpty ? null : text;
}
