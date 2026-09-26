import 'json_utils.dart';

/// News article — maps `JSO.Domain.Article`.
///
/// The list endpoint (`GET /api/news`) returns the full entity including
/// `status` and `body`. The detail projection (`GET /api/news/{slug}`) omits
/// `status`, so it is optional here.
class Article {
  const Article({
    required this.id,
    required this.title,
    required this.slug,
    required this.excerpt,
    required this.body,
    this.status,
    this.publishedAt,
    this.coverImageUrl,
  });

  final String id;
  final String title;
  final String slug;
  final String excerpt;
  final String body;
  final String? status;
  final DateTime? publishedAt;
  final String? coverImageUrl;

  factory Article.fromJson(Map<String, dynamic> json) => Article(
    id: asString(json['id']),
    title: asString(json['title']),
    slug: asString(json['slug']),
    excerpt: asString(json['excerpt']),
    body: asString(json['body']),
    status: asStringOrNull(json['status']),
    publishedAt: asDateTimeOrNull(json['publishedAt']),
    coverImageUrl: asStringOrNull(json['coverImageUrl']),
  );
}

/// Wraps the `GET /api/news/{slug}` response `{ article, metadata }`.
///
/// `metadata` is an open bag (SEO/OpenGraph fields) kept as a raw map.
class ArticleDetail {
  const ArticleDetail({required this.article, this.metadata});

  final Article article;
  final Map<String, dynamic>? metadata;

  factory ArticleDetail.fromJson(Map<String, dynamic> json) {
    final rawArticle = json['article'];
    final rawMetadata = json['metadata'];
    return ArticleDetail(
      article: Article.fromJson(
        rawArticle is Map
            ? Map<String, dynamic>.from(rawArticle)
            : <String, dynamic>{},
      ),
      metadata: rawMetadata is Map
          ? Map<String, dynamic>.from(rawMetadata)
          : null,
    );
  }
}
