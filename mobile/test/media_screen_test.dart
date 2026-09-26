import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/media/media_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('MediaScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        media: [Sample.media()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const MediaScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('renders a grid with type badges on success', (tester) async {
      final repo = FakeRepository(
        media: [
          Sample.media(type: 'Image', title: 'Photo'),
          Sample.media(type: 'Video', title: 'Clip'),
        ],
      );

      await pumpScreen(tester, repository: repo, child: const MediaScreen());
      await tester.pumpAndSettle();

      expect(find.text('Image'), findsWidgets);
      expect(find.text('Video'), findsWidgets);
    });

    testWidgets('shows EmptyView when there is no media', (tester) async {
      final repo = FakeRepository(media: const []);

      await pumpScreen(tester, repository: repo, child: const MediaScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const ApiTimeoutException());

      await pumpScreen(tester, repository: repo, child: const MediaScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
