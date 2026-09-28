import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:provider/provider.dart';

import 'support/fake_match_center.dart';
import 'support/fake_repository.dart';
import 'support/test_harness.dart';

Provider<MatchCenterRepository> _matchCenterProvider() =>
    Provider<MatchCenterRepository>.value(value: FakeMatchCenterRepository());

Future<void> _pumpDetail(WidgetTester tester, FakeRepository repository) {
  return pumpScreen(
    tester,
    repository: repository,
    providers: [_matchCenterProvider()],
    child: const MatchDetailScreen(matchId: 'x'),
  );
}

/// Opens the "Direct" tab after the match/chronology load completes without
/// settling the periodic poll timer.
Future<void> _openDirectTab(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
  await tester.tap(find.text('Direct'));
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
  await tester.pump();
}

void main() {
  group('MatchDetailScreen — direct', () {
    testWidgets('shows the French loading state while the feed is pending', (
      tester,
    ) async {
      final repository = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlog: [Sample.liveBlogEntry()],
        delay: const Duration(seconds: 1),
      );

      await _pumpDetail(tester, repository);
      await tester.pump(const Duration(seconds: 1, milliseconds: 50));
      await tester.tap(find.text('Direct'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      expect(find.text('Chargement du direct…'), findsOneWidget);

      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('renders pinned and regular entries with localized kinds', (
      tester,
    ) async {
      final repository = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlog: [
          Sample.liveBlogEntry(
            id: 'pinned',
            kind: 'Goal',
            minute: 23,
            body: 'BUUUT pour la JSO !',
            isPinned: true,
          ),
          Sample.liveBlogEntry(
            id: 'plain',
            kind: 'Text',
            minute: 30,
            body: 'La JSO contrôle le jeu.',
          ),
        ],
      );

      await _pumpDetail(tester, repository);
      await _openDirectTab(tester);

      expect(find.text('BUUUT pour la JSO !'), findsOneWidget);
      expect(find.text('La JSO contrôle le jeu.'), findsOneWidget);
      expect(find.text('But'), findsOneWidget);
      expect(find.text('Info'), findsOneWidget);
      expect(find.text("23'"), findsOneWidget);
      expect(find.byIcon(Icons.push_pin), findsOneWidget);
    });

    testWidgets('shows the French empty state when there are no entries', (
      tester,
    ) async {
      final repository = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlog: const [],
      );

      await _pumpDetail(tester, repository);
      await _openDirectTab(tester);

      expect(find.text('Pas encore de mise à jour en direct.'), findsOneWidget);
    });

    testWidgets('shows the French error state with retry on failure', (
      tester,
    ) async {
      final repository = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlogError: const NetworkException('offline'),
      );

      await _pumpDetail(tester, repository);
      await _openDirectTab(tester);

      expect(find.text('Impossible de charger le direct.'), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
    });
  });
}
