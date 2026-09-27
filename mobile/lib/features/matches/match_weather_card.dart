import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/match_reminder.dart';

/// French label (null when unknown) and icon for a weather condition.
typedef WeatherCondition = ({String? label, IconData icon});

/// Maps a WMO weather interpretation code, as relayed by
/// `GET /api/matches/{id}/reminder`, to French copy and a Material icon.
///
/// The server's `condition` text is English, so the app derives its label
/// from the code, with the same groups as `WeatherService.DescribeWeatherCode`
/// on the backend. A missing or unknown code has no label and a thermometer
/// icon.
WeatherCondition weatherConditionOf(int? code) {
  return switch (code) {
    0 => (label: 'Ciel dégagé', icon: Icons.wb_sunny_outlined),
    1 => (label: 'Plutôt dégagé', icon: Icons.wb_sunny_outlined),
    2 => (label: 'Partiellement nuageux', icon: Icons.wb_cloudy_outlined),
    3 => (label: 'Couvert', icon: Icons.cloud_outlined),
    45 || 48 => (label: 'Brouillard', icon: Icons.foggy),
    51 || 53 || 55 => (label: 'Bruine', icon: Icons.grain),
    56 || 57 => (label: 'Bruine verglaçante', icon: Icons.ac_unit),
    61 || 63 || 65 => (label: 'Pluie', icon: Icons.water_drop_outlined),
    66 || 67 => (label: 'Pluie verglaçante', icon: Icons.ac_unit),
    71 || 73 || 75 => (label: 'Neige', icon: Icons.ac_unit),
    77 => (label: 'Grains de neige', icon: Icons.ac_unit),
    80 || 81 || 82 => (label: 'Averses', icon: Icons.umbrella_outlined),
    85 || 86 => (label: 'Averses de neige', icon: Icons.cloudy_snowing),
    95 => (label: 'Orage', icon: Icons.thunderstorm),
    96 || 99 => (label: 'Orage avec grêle', icon: Icons.thunderstorm),
    _ => (label: null, icon: Icons.thermostat),
  };
}

/// "Météo du match" card: the kickoff forecast of an upcoming match
/// (condition, temperature, precipitation probability, location and source).
/// Missing measurements are simply left out.
class MatchWeatherCard extends StatelessWidget {
  const MatchWeatherCard({super.key, required this.weather});

  final MatchWeather weather;

  @override
  Widget build(BuildContext context) {
    final condition = weatherConditionOf(weather.weatherCode);
    final temperature = weather.temperatureCelsius;
    final precipitation = weather.precipitationProbabilityPercent;
    final location = weather.locationLabel.trim();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Météo du match',
              style: TextStyle(
                color: JsoColors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: JsoSpacing.md),
            Row(
              children: [
                Icon(condition.icon, color: JsoColors.gold, size: 40),
                const SizedBox(width: JsoSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (temperature != null)
                        Text(
                          '${temperature.round()} °C',
                          style: const TextStyle(
                            color: JsoColors.gold,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      if (condition.label != null)
                        Text(
                          condition.label!,
                          style: const TextStyle(
                            color: JsoColors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (precipitation != null) ...[
              const SizedBox(height: JsoSpacing.md),
              _InfoLine(
                icon: Icons.water_drop_outlined,
                text: 'Précipitations : $precipitation %',
              ),
            ],
            if (location.isNotEmpty) ...[
              const SizedBox(height: JsoSpacing.sm),
              _InfoLine(
                icon: Icons.location_on_outlined,
                text: weather.isApproximateLocation
                    ? '$location (approx.)'
                    : location,
              ),
            ],
            if (weather.provider.isNotEmpty) ...[
              const SizedBox(height: JsoSpacing.sm),
              Text(
                'Source : ${weather.provider}',
                style: const TextStyle(color: JsoColors.muted2, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: JsoColors.muted, size: 18),
        const SizedBox(width: JsoSpacing.sm),
        Expanded(
          child: Text(text, style: const TextStyle(color: JsoColors.muted)),
        ),
      ],
    );
  }
}
