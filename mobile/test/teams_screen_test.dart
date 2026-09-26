import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/teams/team_roster_screen.dart';
import 'package:jso_mobile/features/teams/teams_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('TeamsScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        teams: [Sample.team()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const TeamsScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('renders team names and category on success', (tester) async {
      final repo = FakeRepository(
        teams: [
          Sample.team(name: 'Séniors', category: 'Senior'),
          Sample.team(id: 't2', name: 'U19', category: 'Youth'),
        ],
      );

      await pumpScreen(tester, repository: repo, child: const TeamsScreen());
      await tester.pumpAndSettle();

      expect(find.text('Séniors'), findsOneWidget);
      expect(find.text('U19'), findsOneWidget);
      expect(find.text('Senior'), findsOneWidget);
      expect(find.text('Youth'), findsOneWidget);
    });

    testWidgets('shows EmptyView when there are no teams', (tester) async {
      final repo = FakeRepository(teams: const []);

      await pumpScreen(tester, repository: repo, child: const TeamsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const ApiTimeoutException());

      await pumpScreen(tester, repository: repo, child: const TeamsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('tapping a team navigates to the roster', (tester) async {
      final repo = FakeRepository(
        teams: [Sample.team(name: 'Séniors')],
        players: [Sample.player(firstName: 'Ali', lastName: 'Ben Salah')],
      );

      await pumpScreen(tester, repository: repo, child: const TeamsScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Séniors'));
      await tester.pumpAndSettle();

      expect(find.byType(TeamRosterScreen), findsOneWidget);
      expect(find.text('Ali Ben Salah'), findsOneWidget);
    });
  });
}
