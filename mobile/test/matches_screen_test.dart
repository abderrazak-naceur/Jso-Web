import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:jso_mobile/features/matches/matches_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';
import 'package:provider/provider.dart';

import 'support/fake_match_center.dart';
import 'support/fake_repository.dart';
import 'support/test_harness.dart';

Provider<MatchCenterRepository> _matchCenterProvider() =>
    Provider<MatchCenterRepository>.value(value: FakeMatchCenterRepository());

void main() {
  group('MatchesScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        matches: [Sample.match()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const MatchesScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('lists matches on success', (tester) async {
      final repo = FakeRepository(matches: [Sample.match()]);

      await pumpScreen(tester, repository: repo, child: const MatchesScreen());
      await tester.pumpAndSettle();

      expect(find.text('JSO vs CS Sfaxien'), findsOneWidget);
      expect(find.text('2 - 1'), findsOneWidget);
    });

    testWidgets('shows EmptyView when there are no matches', (tester) async {
      final repo = FakeRepository(matches: const []);

      await pumpScreen(tester, repository: repo, child: const MatchesScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const ApiHttpException(500, 'boom'));

      await pumpScreen(tester, repository: repo, child: const MatchesScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
    });
  });

  group('MatchDetailScreen', () {
    testWidgets('renders four tabs, localized header and chronology', (
      tester,
    ) async {
      final repo = FakeRepository(
        match: Sample.match(),
        matchEvents: [Sample.event()],
      );

      await pumpScreen(
        tester,
        repository: repo,
        providers: [_matchCenterProvider()],
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Résumé'), findsOneWidget);
      expect(find.text('Direct'), findsOneWidget);
      expect(find.text('Compos'), findsOneWidget);
      expect(find.text('Stats'), findsOneWidget);
      expect(find.text('2 - 1'), findsOneWidget);
      expect(find.text('Terminé · Domicile'), findsOneWidget);
      expect(find.text('Chronologie'), findsOneWidget);
      expect(find.text('But'), findsOneWidget);
      expect(find.text('Ali Ben Salah'), findsOneWidget);
    });

    testWidgets('shows localized empty chronology when there are no events', (
      tester,
    ) async {
      final repo = FakeRepository(match: Sample.match(), matchEvents: const []);

      await pumpScreen(
        tester,
        repository: repo,
        providers: [_matchCenterProvider()],
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('Aucun événement enregistré pour ce match.'),
        findsOneWidget,
      );
    });

    testWidgets('shows localized ErrorView with Retry on failure', (
      tester,
    ) async {
      final repo = FakeRepository(error: const NotFoundException());

      await pumpScreen(
        tester,
        repository: repo,
        providers: [_matchCenterProvider()],
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Impossible de charger ce match.'), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
    });
  });
}
