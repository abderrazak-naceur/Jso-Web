import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/article.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';
import 'news_detail_screen.dart';

/// News tab: the article list from `GET /api/news`.
class NewsScreen extends StatefulWidget {
  const NewsScreen({super.key});

  @override
  State<NewsScreen> createState() => _NewsScreenState();
}

class _NewsScreenState extends State<NewsScreen> {
  late Future<List<Article>> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getNews();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('News')),
      body: FutureBuilder<List<Article>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading news…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load news.',
              onRetry: () => setState(_load),
            );
          }

          final articles = snapshot.data ?? const <Article>[];
          if (articles.isEmpty) {
            return const EmptyView(
              message: 'No news published yet.',
              icon: Icons.article_outlined,
            );
          }

          return RefreshIndicator(
            color: JsoColors.gold,
            onRefresh: () async => setState(_load),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: JsoSpacing.md,
                vertical: JsoSpacing.sm,
              ),
              itemCount: articles.length,
              itemBuilder: (context, i) => _ArticleCard(article: articles[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ArticleCard extends StatelessWidget {
  const _ArticleCard({required this.article});

  final Article article;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => NewsDetailScreen(slug: article.slug),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: RemoteImage(url: article.coverImageUrl),
            ),
            Padding(
              padding: const EdgeInsets.all(JsoSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    article.title,
                    style: const TextStyle(
                      color: JsoColors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (article.publishedAt != null) ...[
                    const SizedBox(height: JsoSpacing.xs),
                    Text(
                      JsoFormat.date(article.publishedAt!),
                      style: const TextStyle(color: JsoColors.muted2),
                    ),
                  ],
                  if (article.excerpt.isNotEmpty) ...[
                    const SizedBox(height: JsoSpacing.sm),
                    Text(
                      article.excerpt,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: JsoColors.muted),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
