import 'json_utils.dart';

/// Pre-match reminder — maps `GET /api/matches/{id}/reminder`: the kickoff
/// data plus an optional [weather] forecast.
///
/// [weather] is null when the kickoff is past or beyond the forecast horizon,
/// or when the provider is unavailable; the server never fails the reminder
/// because of the weather.
class MatchReminder {
  const MatchReminder({
    required this.id,
    required this.opponentName,
    required this.kickoffAt,
    this.venue,
    required this.isHome,
    required this.status,
    this.weather,
  });

  final String id;
  final String opponentName;
  final DateTime kickoffAt;
  final String? venue;
  final bool isHome;
  final String status;
  final MatchWeather? weather;

  factory MatchReminder.fromJson(Map<String, dynamic> json) {
    final weather = json['weather'];
    return MatchReminder(
      id: asString(json['id']),
      opponentName: asString(json['opponentName']),
      kickoffAt: asDateTime(json['kickoffAt']),
      venue: asStringOrNull(json['venue']),
      isHome: asBool(json['isHome']),
      status: asString(json['status'], fallback: 'Scheduled'),
      weather: weather is Map
          ? MatchWeather.fromJson(Map<String, dynamic>.from(weather))
          : null,
    );
  }
}

/// Forecast for the kickoff hour — maps `JSO.Api.WeatherForecast`
/// (Open-Meteo, resolved against the club's default location).
///
/// Every measurement is optional. [condition] is the server's English label
/// for [weatherCode] (e.g. "Partly cloudy"), so the app derives its French
/// copy from the WMO [weatherCode] instead.
class MatchWeather {
  const MatchWeather({
    this.temperatureCelsius,
    this.precipitationProbabilityPercent,
    this.weatherCode,
    this.condition,
    required this.locationLabel,
    required this.isApproximateLocation,
    required this.provider,
  });

  final double? temperatureCelsius;
  final int? precipitationProbabilityPercent;

  /// WMO weather interpretation code (0 clear sky … 99 thunderstorm).
  final int? weatherCode;
  final String? condition;

  /// Where the forecast applies (e.g. "Oudhref, Tunisia").
  final String locationLabel;

  /// True when [locationLabel] is the club's default location rather than
  /// the match venue.
  final bool isApproximateLocation;

  /// Forecast source (e.g. "Open-Meteo").
  final String provider;

  /// Whether at least one measurement is present.
  bool get hasForecast =>
      temperatureCelsius != null ||
      precipitationProbabilityPercent != null ||
      weatherCode != null;

  factory MatchWeather.fromJson(Map<String, dynamic> json) => MatchWeather(
    temperatureCelsius: asDoubleOrNull(json['temperatureCelsius']),
    precipitationProbabilityPercent: asIntOrNull(
      json['precipitationProbabilityPercent'],
    ),
    weatherCode: asIntOrNull(json['weatherCode']),
    condition: asStringOrNull(json['condition']),
    locationLabel: asString(json['locationLabel']),
    isApproximateLocation: asBool(json['isApproximateLocation']),
    provider: asString(json['provider']),
  );
}
