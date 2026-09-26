import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/sponsors/sponsors_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
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
