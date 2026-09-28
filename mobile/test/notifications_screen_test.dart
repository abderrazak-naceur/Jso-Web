import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/club_event.dart';
import 'package:jso_mobile/data/models/home_data.dart';
import 'package:jso_mobile/data/repositories/club_content_repository.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/features/matches/match_detail_screen.dart';
import 'package:jso_mobile/features/notifications/notifications_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';

import 'support/fake_club_content.dart';
import 'support/fake_match_center.dart';
import 'support/fake_repository.dart';
import 'support/test_harness.dart';

Future<void> _pump(
  WidgetTester tester, {
  required FakeRepository repository,
  required FakeClubContentRepository content,
}) {
  return pumpScreen(
    tester,
    repository: repository,
    child: const NotificationsScreen(),
    providers: [
      Provider<ClubContentRepository>.value(value: content),
      // The match alert deep-links to MatchDetailScreen, which reads this.
      Provider<MatchCenterRepository>.value(value: FakeMatchCenterRepository()),
    ],
  );
}

void main() {
  testWidgets('aggregates the next match, event and news into alerts', (
    tester,
  ) async {
    final future = DateTime.now().add(const Duration(days: 3));
    final repository = FakeRepository(
      homeData: HomeData(
        club: Sample.club(),
        nextMatch: Sample.match(
          status: 'Scheduled',
          homeScore: null,
          awayScore: null,
        ),
        recentMatches: const [],
        news: [Sample.article(title: 'Grande victoire')],
        content: const {},
      ),
    );
    final content = FakeClubContentRepository(
      events: [
        ClubEvent(
          id: 'e1',
          title: 'Assemblée générale',
          slug: 'ag-2026',
          startAt: future,
        ),
      ],
    );

    await _pump(tester, repository: repository, content: content);
    await tester.pumpAndSettle();

    expect(find.text('JSO vs CS Sfaxien'), findsOneWidget);
    expect(find.text('Assemblée générale'), findsOneWidget);
    expect(find.text('Grande victoire'), findsOneWidget);
  });

  testWidgets('shows an empty state when there is nothing to notify', (
    tester,
  ) async {
    final repository = FakeRepository(homeData: Sample.home(populated: false));
    final content = FakeClubContentRepository();

    await _pump(tester, repository: repository, content: content);
    await tester.pumpAndSettle();

    expect(find.byType(EmptyView), findsOneWidget);
  });

  testWidgets('still lists alerts when the events call fails', (tester) async {
    final repository = FakeRepository(
      homeData: HomeData(
        club: Sample.club(),
        nextMatch: Sample.match(
          status: 'Scheduled',
          homeScore: null,
          awayScore: null,
        ),
        recentMatches: const [],
        news: const [],
        content: const {},
      ),
    );
    // Events fail, but the notifications list must still render the match.
    final content = FakeClubContentRepository(error: const NetworkException());

    await _pump(tester, repository: repository, content: content);
    await tester.pumpAndSettle();

    expect(find.text('JSO vs CS Sfaxien'), findsOneWidget);
    expect(find.byType(ErrorView), findsNothing);
  });

  testWidgets('surfaces an error when the home call fails', (tester) async {
    final repository = FakeRepository(error: const NetworkException());
    final content = FakeClubContentRepository();

    await _pump(tester, repository: repository, content: content);
    await tester.pumpAndSettle();

    expect(find.byType(ErrorView), findsOneWidget);
  });

  testWidgets('opens the match detail when a match alert is tapped', (
    tester,
  ) async {
    final repository = FakeRepository(
      homeData: HomeData(
        club: Sample.club(),
        nextMatch: Sample.match(
          status: 'Scheduled',
          homeScore: null,
          awayScore: null,
        ),
        recentMatches: const [],
        news: const [],
        content: const {},
      ),
      match: Sample.match(
        status: 'Scheduled',
        homeScore: null,
        awayScore: null,
      ),
      matchEvents: const [],
      liveBlog: const [],
    );
    final content = FakeClubContentRepository();

    await _pump(tester, repository: repository, content: content);
    await tester.pumpAndSettle();

    await tester.tap(find.text('JSO vs CS Sfaxien'));
    await tester.pumpAndSettle();

    expect(find.byType(MatchDetailScreen), findsOneWidget);
  });
}
