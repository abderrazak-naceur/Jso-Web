import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

/// Opens the "Live" tab of [MatchDetailScreen] after the match/timeline load
/// completes, without settling the periodic poll timer.
Future<void> _openLiveTab(WidgetTester tester) async {
  // Let the initial match/events Future resolve.
  await tester.pump();
  await tester.pump();
  await tester.tap(find.text('Live'));
  // Settle the tab-switch animation.
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
  // Let the live-blog load Future resolve.
  await tester.pump();
}

void main() {
  group('MatchDetailScreen — Live blog', () {
    testWidgets('shows LoadingView while the live feed is pending', (
      tester,
    ) async {
      final repo = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlog: [Sample.liveBlogEntry()],
        delay: const Duration(seconds: 1),
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      // Resolve match/events first (delay elapsed), then reveal Live tab.
      await tester.pump(const Duration(seconds: 1, milliseconds: 50));
      await tester.tap(find.text('Live'));
      // Settle the tab-switch animation while the live future is still pending.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      // The live-blog tab is mounted and its feed is still loading.
      expect(find.byType(LoadingView), findsOneWidget);

      // Drain the pending live-blog future so no timers dangle.
      await tester.pump(const Duration(seconds: 1));
    });

    testWidgets('renders pinned and regular entries with kind and minute', (
      tester,
    ) async {
      final repo = FakeRepository(
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

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await _openLiveTab(tester);

      expect(find.text('BUUUT pour la JSO !'), findsOneWidget);
      expect(find.text('La JSO contrôle le jeu.'), findsOneWidget);
      expect(find.text('Goal'), findsOneWidget);
      expect(find.text("23'"), findsOneWidget);
      // Pinned entry surfaces a pin icon.
      expect(find.byIcon(Icons.push_pin), findsOneWidget);
    });

    testWidgets('shows EmptyView when the live feed has no entries', (
      tester,
    ) async {
      final repo = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlog: const [],
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await _openLiveTab(tester);

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry when the live feed fails', (
      tester,
    ) async {
      final repo = FakeRepository(
        match: Sample.match(),
        matchEvents: const [],
        liveBlogError: const NetworkException('offline'),
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const MatchDetailScreen(matchId: 'x'),
      );
      await _openLiveTab(tester);

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
