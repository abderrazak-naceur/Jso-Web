import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/home/home_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('HomeScreen', () {
    testWidgets('shows LoadingView while the request is pending', (
      tester,
    ) async {
      final repo = FakeRepository(
        homeData: Sample.home(),
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const HomeScreen());

      expect(find.byType(LoadingView), findsOneWidget);

      await tester.pumpAndSettle();
    });

    testWidgets('shows populated content on success', (tester) async {
      final repo = FakeRepository(homeData: Sample.home());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.text('Next match'), findsOneWidget);
      expect(find.text('Recent matches'), findsOneWidget);
      expect(find.byType(EmptyView), findsNothing);

      // "Latest news" is below the fold; scroll it into view.
      await tester.scrollUntilVisible(
        find.text('Latest news'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Latest news'), findsOneWidget);
    });

    testWidgets('renders the About the club section for a content-only '
        'payload without showing EmptyView', (tester) async {
      final repo = FakeRepository(homeData: Sample.homeContentOnly());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsNothing);

      // The content section can sit below the fold; scroll it into view.
      await tester.scrollUntilVisible(
        find.text('About the club'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('About the club'), findsOneWidget);
      expect(find.text('JSO is the pride of Oudhref.'), findsOneWidget);
    });

    testWidgets('shows EmptyView when payload has no content', (tester) async {
      final repo = FakeRepository(homeData: Sample.home(populated: false));

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const NetworkException());

      await pumpScreen(tester, repository: repo, child: const HomeScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
