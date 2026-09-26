import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/config/jso_theme.dart';
import '../../data/models/article.dart';
import '../../data/repositories/public_api_repository.dart';
import '../../shared/format.dart';
import '../../shared/widgets/error_view.dart';
import '../../shared/widgets/loading_view.dart';
import '../../shared/widgets/remote_image.dart';

/// Article detail: `GET /api/news/{slug}` (keyed by SLUG, not id).
class NewsDetailScreen extends StatefulWidget {
  const NewsDetailScreen({super.key, required this.slug});

  final String slug;

  @override
  State<NewsDetailScreen> createState() => _NewsDetailScreenState();
}

class _NewsDetailScreenState extends State<NewsDetailScreen> {
  late Future<ArticleDetail> _future;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _future = context.read<PublicApiRepository>().getNewsArticle(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Article')),
      body: FutureBuilder<ArticleDetail>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const LoadingView(message: 'Loading article…');
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not load this article.',
              onRetry: () => setState(_load),
            );
          }

          final detail = snapshot.data;
          if (detail == null) {
            return ErrorView(
              message: 'Could not load this article.',
              onRetry: () => setState(_load),
            );
          }

          final article = detail.article;
          return ListView(
            padding: EdgeInsets.zero,
            children: [
              if (article.coverImageUrl != null &&
                  article.coverImageUrl!.isNotEmpty)
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
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    if (article.publishedAt != null) ...[
                      const SizedBox(height: JsoSpacing.xs),
                      Text(
                        JsoFormat.date(article.publishedAt!),
                        style: const TextStyle(color: JsoColors.muted2),
                      ),
                    ],
                    const SizedBox(height: JsoSpacing.md),
                    Text(
                      article.body.isNotEmpty ? article.body : article.excerpt,
                      style: const TextStyle(
                        color: JsoColors.white,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
