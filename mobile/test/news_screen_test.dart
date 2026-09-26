import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/features/news/news_detail_screen.dart';
import 'package:jso_mobile/features/news/news_screen.dart';
import 'package:jso_mobile/shared/widgets/empty_view.dart';
import 'package:jso_mobile/shared/widgets/error_view.dart';
import 'package:jso_mobile/shared/widgets/loading_view.dart';

import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  group('NewsScreen', () {
    testWidgets('shows LoadingView while pending', (tester) async {
      final repo = FakeRepository(
        news: [Sample.article()],
        delay: const Duration(milliseconds: 50),
      );

      await pumpScreen(tester, repository: repo, child: const NewsScreen());

      expect(find.byType(LoadingView), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('lists articles on success', (tester) async {
      final repo = FakeRepository(news: [Sample.article()]);

      await pumpScreen(tester, repository: repo, child: const NewsScreen());
      await tester.pumpAndSettle();

      expect(find.text('Victoire à domicile'), findsOneWidget);
    });

    testWidgets('shows EmptyView when there is no news', (tester) async {
      final repo = FakeRepository(news: const []);

      await pumpScreen(tester, repository: repo, child: const NewsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyView), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const NetworkException());

      await pumpScreen(tester, repository: repo, child: const NewsScreen());
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });

  group('NewsDetailScreen', () {
    testWidgets('renders the article by slug', (tester) async {
      final repo = FakeRepository(newsArticle: Sample.articleDetail());

      await pumpScreen(
        tester,
        repository: repo,
        child: const NewsDetailScreen(slug: 'victoire-a-domicile'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Victoire à domicile'), findsOneWidget);
      expect(find.text('Compte rendu complet.'), findsOneWidget);
    });

    testWidgets('shows ErrorView with Retry on failure', (tester) async {
      final repo = FakeRepository(error: const NotFoundException());

      await pumpScreen(
        tester,
        repository: repo,
        child: const NewsDetailScreen(slug: 'missing'),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ErrorView), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
