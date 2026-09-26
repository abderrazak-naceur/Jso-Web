/// Small defensive helpers for parsing loosely-typed JSON maps.
///
/// The .NET API serializes with default camelCase naming; these helpers
/// tolerate nulls and mild type differences so `fromJson` factories stay clean.
library;

String asString(Object? value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString();
}

String? asStringOrNull(Object? value) {
  if (value == null) return null;
  final s = value.toString();
  return s.isEmpty ? null : s;
}

int? asIntOrNull(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

int asInt(Object? value, {int fallback = 0}) {
  return asIntOrNull(value) ?? fallback;
}

bool asBool(Object? value, {bool fallback = false}) {
  if (value == null) return fallback;
  if (value is bool) return value;
  final s = value.toString().toLowerCase();
  if (s == 'true') return true;
  if (s == 'false') return false;
  return fallback;
}

/// Parses an ISO-8601 / DateTimeOffset string into [DateTime]; null-safe.
DateTime? asDateTimeOrNull(Object? value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

DateTime asDateTime(Object? value) {
  return asDateTimeOrNull(value) ?? DateTime.fromMillisecondsSinceEpoch(0);
}

/// Parses a JSON array into a typed list using [fromJson] for each element.
List<T> asList<T>(Object? value, T Function(Map<String, dynamic>) fromJson) {
  if (value is! List) return <T>[];
  return value
      .whereType<Map>()
      .map((e) => fromJson(Map<String, dynamic>.from(e)))
      .toList(growable: false);
}
