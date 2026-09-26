import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:jso_mobile/features/matches/matches_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

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
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('MatchDetailScreen', () {
    testWidgets('renders score header and event timeline', (tester) async {
      final repo = FakeRepository(
        match: Sample.match(),
        matchEvents: [Sample.event()],
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(find.text('2 - 1'), findsOneWidget);
      expect(find.text('Goal'), findsOneWidget);
      expect(find.text('Ali Ben Salah'), findsOneWidget);
    });

    testWidgets('shows empty timeline when there are no events', (
      tester,
    ) async {
      final repo = FakeRepository(match: Sample.match(), matchEvents: const []);

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const NotFoundException());

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
