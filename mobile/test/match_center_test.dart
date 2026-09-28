import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/match.dart';
import 'package:jso_mobile/data/models/match_lineup_entry.dart';
import 'package:jso_mobile/data/models/match_official.dart';
import 'package:jso_mobile/data/models/match_reminder.dart';
import 'package:jso_mobile/data/models/match_stat.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:provider/provider.dart';

import 'support/fake_match_center.dart';
import 'support/fake_repository.dart';
import 'support/test_harness.dart';

const _matchId = 'match-1';

Match _match({
  String status = 'Scheduled',
  DateTime? kickoffAt,
  int? homeScore,
  int? awayScore,
}) {
  return Match(
    id: _matchId,
    seasonId: 'season-1',
    competitionId: 'competition-1',
    teamId: 'team-1',
    opponentName: 'AS Gabès',
    kickoffAt: kickoffAt ?? DateTime.utc(2099, 5, 20, 18, 30),
    venue: 'Stade de Oudhref',
    isHome: true,
    homeScore: homeScore,
    awayScore: awayScore,
    status: status,
  );
}

MatchWeather _weather() {
  return const MatchWeather(
    temperatureCelsius: 18.4,
    precipitationProbabilityPercent: 25,
    weatherCode: 2,
    condition: 'Partly cloudy',
    locationLabel: 'Oudhref, Tunisie',
    isApproximateLocation: true,
    provider: 'Open-Meteo',
  );
}

MatchReminder _reminder({MatchWeather? weather}) {
  return MatchReminder(
    id: _matchId,
    opponentName: 'AS Gabès',
    kickoffAt: DateTime.utc(2099, 5, 20, 18, 30),
    venue: 'Stade de Oudhref',
    isHome: true,
    status: 'Scheduled',
    weather: weather,
  );
}

Future<void> _pumpDetail(
  WidgetTester tester, {
  required Match match,
  required FakeMatchCenterRepository matchCenter,
}) async {
  await pumpScreen(
    tester,
    repository: FakeRepository(
      match: match,
      matchEvents: const [],
      liveBlog: const [],
    ),
    providers: [Provider<MatchCenterRepository>.value(value: matchCenter)],
    child: const MatchDetailScreen(matchId: _matchId),
  );
  await tester.pump();
  await tester.pump();
  await tester.pump();
}

Future<void> _openTab(WidgetTester tester, String label) async {
  await tester.tap(find.text(label));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 350));
  await tester.pump();
  await tester.pump();
}

void main() {
  group('MatchDetailScreen weather', () {
    testWidgets('shows the forecast and caches the reminder request', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(
        reminder: _reminder(weather: _weather()),
      );

      await _pumpDetail(tester, match: _match(), matchCenter: matchCenter);

      expect(find.text('Météo du match'), findsOneWidget);
      expect(find.text('18 °C'), findsOneWidget);
      expect(find.text('Partiellement nuageux'), findsOneWidget);
      expect(matchCenter.reminderCallCount, 1);

      await _openTab(tester, 'Direct');
      await _openTab(tester, 'Résumé');

      expect(find.text('Météo du match'), findsOneWidget);
      expect(matchCenter.reminderCallCount, 1);
    });

    testWidgets('hides the card when the reminder has no weather', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(reminder: _reminder());

      await _pumpDetail(tester, match: _match(), matchCenter: matchCenter);

      expect(find.text('Météo du match'), findsNothing);
      expect(find.text('Billetterie'), findsOneWidget);
      expect(matchCenter.reminderCallCount, 1);
    });

    testWidgets('hides weather failures without hiding the match', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(
        reminderError: const NetworkException('offline'),
      );

      await _pumpDetail(tester, match: _match(), matchCenter: matchCenter);

      expect(find.text('Météo du match'), findsNothing);
      expect(find.text('JSO vs AS Gabès'), findsOneWidget);
      expect(find.text('Billetterie'), findsOneWidget);
    });

    testWidgets('does not request or show weather for a finished match', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(
        reminder: _reminder(weather: _weather()),
      );

      await _pumpDetail(
        tester,
        match: _match(status: 'Finished'),
        matchCenter: matchCenter,
      );

      expect(find.text('Météo du match'), findsNothing);
      expect(find.text('Terminé · Domicile'), findsOneWidget);
      expect(matchCenter.reminderCallCount, 0);
    });

    testWidgets('does not show weather for a past scheduled match', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(
        reminder: _reminder(weather: _weather()),
      );

      await _pumpDetail(
        tester,
        match: _match(kickoffAt: DateTime.utc(2020, 1, 1)),
        matchCenter: matchCenter,
      );

      expect(find.text('Météo du match'), findsNothing);
      expect(matchCenter.reminderCallCount, 1);
    });
  });

  group('MatchDetailScreen match-center tabs', () {
    testWidgets('Compos renders lineup, captain and officials', (tester) async {
      final matchCenter = FakeMatchCenterRepository(
        lineup: const [
          MatchLineupEntry(
            id: 'lineup-1',
            playerId: 'player-1',
            firstName: 'Ali',
            lastName: 'Mansouri',
            shirtNumber: 10,
            playerPosition: 'Milieu',
            role: 'Starter',
            positionOrder: 1,
            position: 'Attaquant',
            isCaptain: true,
            isSubstitute: false,
          ),
        ],
        officials: const [
          MatchOfficial(
            id: 'official-1',
            matchId: _matchId,
            name: 'Mehdi Trabelsi',
            role: 'Assistant 1',
          ),
        ],
      );

      await _pumpDetail(
        tester,
        match: _match(status: 'Finished'),
        matchCenter: matchCenter,
      );
      await _openTab(tester, 'Compos');

      expect(find.text('Titulaires'), findsOneWidget);
      expect(find.text('Ali Mansouri'), findsOneWidget);
      expect(find.bySemanticsLabel('Capitaine'), findsOneWidget);
      expect(find.text('Mehdi Trabelsi'), findsOneWidget);
      expect(find.text('Arbitre assistant 1'), findsOneWidget);
    });

    testWidgets('Compos renders its independent empty states', (tester) async {
      final matchCenter = FakeMatchCenterRepository();

      await _pumpDetail(
        tester,
        match: _match(status: 'Finished'),
        matchCenter: matchCenter,
      );
      await _openTab(tester, 'Compos');

      expect(find.text('Composition non communiquée.'), findsOneWidget);
      expect(find.text('Arbitres non communiqués.'), findsOneWidget);
    });

    testWidgets('Stats renders populated rows including a null value', (
      tester,
    ) async {
      final matchCenter = FakeMatchCenterRepository(
        stats: const [
          MatchStat(
            id: 'stat-1',
            matchId: _matchId,
            name: 'Tirs cadrés',
            homeValue: 7,
          ),
        ],
      );

      await _pumpDetail(
        tester,
        match: _match(status: 'Finished'),
        matchCenter: matchCenter,
      );
      await _openTab(tester, 'Stats');

      expect(find.text('JSO'), findsOneWidget);
      expect(find.text('AS Gabès'), findsOneWidget);
      expect(find.text('Tirs cadrés'), findsOneWidget);
      expect(find.text('7'), findsOneWidget);
      expect(find.text('–'), findsOneWidget);
    });

    testWidgets('Stats renders its empty state', (tester) async {
      final matchCenter = FakeMatchCenterRepository();

      await _pumpDetail(
        tester,
        match: _match(status: 'Finished'),
        matchCenter: matchCenter,
      );
      await _openTab(tester, 'Stats');

      expect(find.text('Statistiques non disponibles.'), findsOneWidget);
    });
  });
}
