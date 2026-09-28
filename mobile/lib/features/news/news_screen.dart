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
      appBar: AppBar(title: const Text('Actualités')),
      body: FutureBuilder<List<Article>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Chargement des actualités…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Impossible de charger les actualités.',
              onRetry: () => setState(_load),
            );
          }

          final articles = snapshot.data ?? const <Article>[];
          if (articles.isEmpty) {
            return const EmptyView(
              message: 'Aucune actualité pour le moment.',
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
            // Cover image with a navy scrim and the title overlaid, for a more
            // editorial, image-forward presentation.
            AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  RemoteImage(
                    url: article.coverImageUrl,
                    placeholderIcon: Icons.photo_outlined,
                  ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x00071A3A),
                          Color(0x40071A3A),
                          Color(0xE6071A3A),
                        ],
                        stops: [0.3, 0.62, 1],
                      ),
                    ),
                  ),
                  Positioned(
                    left: JsoSpacing.md,
                    right: JsoSpacing.md,
                    bottom: JsoSpacing.md,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (article.publishedAt != null) ...[
                          Text(
                            JsoFormat.date(article.publishedAt!),
                            style: const TextStyle(
                              color: JsoColors.gold2,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                        Text(
                          article.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: JsoColors.white,
                            fontSize: 19,
                            height: 1.15,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (article.excerpt.isNotEmpty)
              Padding(
                padding: const EdgeInsets.all(JsoSpacing.md),
                child: Text(
                  article.excerpt,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: JsoColors.muted, height: 1.4),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
