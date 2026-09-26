import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/teams/team_roster_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('TeamRosterScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        players: [Sample.player()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const TeamRosterScreen(teamId: 't1', teamName: 'Séniors'),
      );

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('renders players with shirt number and position', (
      tester,
    ) async {
      final repo = FakeRepository(
        players: [
          Sample.player(
            firstName: 'Ali',
            lastName: 'Ben Salah',
            shirtNumber: 10,
            position: 'Milieu',
          ),
        ],
      );

      await pumpScreen(
        tester,
        repository: repo,
        child: const TeamRosterScreen(teamId: 't1', teamName: 'Séniors'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Séniors'), findsOneWidget); // AppBar title
      expect(find.text('Ali Ben Salah'), findsOneWidget);
      expect(find.text('Milieu'), findsOneWidget);
      expect(find.text('#10'), findsOneWidget);
    });

    testWidgets('shows EmptyView when there are no players', (tester) async {
      final repo = FakeRepository(players: const []);

      await pumpScreen(
        tester,
        repository: repo,
        child: const TeamRosterScreen(teamId: 't1', teamName: 'Séniors'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const ApiTimeoutException());

      await pumpScreen(
        tester,
        repository: repo,
        child: const TeamRosterScreen(teamId: 't1', teamName: 'Séniors'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
