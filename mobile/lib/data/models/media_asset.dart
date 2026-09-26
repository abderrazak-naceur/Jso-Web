import 'json_utils.dart';

/// Media asset — maps `JSO.Domain.MediaAsset`.
class MediaAsset {
  const MediaAsset({
    required this.id,
    required this.title,
    required this.url,
    required this.type,
    this.thumbnailUrl,
    this.caption,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String url;

  /// e.g. "Image" or "Video".
  final String type;
  final String? thumbnailUrl;
  final String? caption;
  final DateTime createdAt;

  factory MediaAsset.fromJson(Map<String, dynamic> json) => MediaAsset(
    id: asString(json['id']),
    title: asString(json['title']),
    url: asString(json['url']),
    type: asString(json['type'], fallback: 'Image'),
    thumbnailUrl: asStringOrNull(json['thumbnailUrl']),
    caption: asStringOrNull(json['caption']),
    createdAt: asDateTime(json['createdAt']),
  );
}
