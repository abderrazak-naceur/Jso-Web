import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/sponsors/sponsors_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';

import 'support/fake_repository.dart';
import 'support/fake_url_launcher.dart';
import 'support/test_harness.dart';

void main() {
  group('SponsorsScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        sponsors: [Sample.sponsor()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('renders name, tier and Visit website action', (tester) async {
      final repo = FakeRepository(
        sponsors: [
          Sample.sponsor(
            name: 'Ooredoo',
            tier: 'Platinum',
            websiteUrl: 'https://sponsor.example.tn',
          ),
        ],
      );

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());
      await tester.pumpAndSettle();

      expect(find.text('Ooredoo'), findsOneWidget);
      expect(find.text('Platinum'), findsOneWidget);
      expect(find.text('Visit website'), findsOneWidget);
    });

    testWidgets('hides Visit website when websiteUrl is empty', (tester) async {
      final repo = FakeRepository(
        sponsors: [Sample.sponsor(name: 'Local Bakery', websiteUrl: null)],
      );

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());
      await tester.pumpAndSettle();

      expect(find.text('Local Bakery'), findsOneWidget);
      expect(find.text('Visit website'), findsNothing);
    });

    testWidgets('shows "Could not open link." SnackBar when launch throws', (
      tester,
    ) async {
      // Route the sponsor link through a fake platform whose launchUrl
      // throws a PlatformException, exercising the throwing failure path
      // without any real platform channel.
      final original = UrlLauncherPlatform.instance;
      final fakeLauncher = FakeUrlLauncher(throwOnLaunch: true);
      UrlLauncherPlatform.instance = fakeLauncher;
      addTearDown(() => UrlLauncherPlatform.instance = original);

      final repo = FakeRepository(
        sponsors: [
          Sample.sponsor(
            name: 'Ooredoo',
            websiteUrl: 'https://sponsor.example.tn',
          ),
        ],
      );

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Visit website'));
      await tester.pump(); // let the async handler run
      await tester.pump(); // let the SnackBar animate in

      expect(fakeLauncher.launchedUrls, isNotEmpty);
      expect(find.text('Could not open link.'), findsOneWidget);
    });

    testWidgets('shows EmptyView when there are no sponsors', (tester) async {
      final repo = FakeRepository(sponsors: const []);

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const ApiTimeoutException());

      await pumpScreen(tester, repository: repo, child: const SponsorsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
