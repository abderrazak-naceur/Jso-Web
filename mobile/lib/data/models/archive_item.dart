import 'json_utils.dart';

/// Digital museum / historical archive item — maps an item of
/// `GET /api/archive`: id, year, category, title, body, mediaAssetId,
/// mediaUrl, displayOrder, createdAt.
///
/// [year] is optional (thematic entries have none). [mediaUrl] is the URL of
/// the linked published media asset, resolved server-side; it may be
/// root-relative (`/uploads/...`) and is null when there is no image.
/// [category] is a free-form key such as `Season`, `Trophy`, `Photo` or
/// `Milestone` (empty when missing).
class ArchiveItem {
  const ArchiveItem({
    required this.id,
    required this.category,
    required this.title,
    required this.body,
    this.year,
    this.mediaAssetId,
    this.mediaUrl,
    this.displayOrder = 0,
    this.createdAt,
  });

  final String id;
  final int? year;
  final String category;
  final String title;
  final String body;
  final String? mediaAssetId;
  final String? mediaUrl;
  final int displayOrder;
  final DateTime? createdAt;

  factory ArchiveItem.fromJson(Map<String, dynamic> json) {
    final mediaUrl = asString(json['mediaUrl']).trim();
    return ArchiveItem(
      id: asString(json['id']),
      year: asIntOrNull(json['year']),
      category: asString(json['category']).trim(),
      title: asString(json['title']),
      body: asString(json['body']),
      mediaAssetId: asStringOrNull(json['mediaAssetId']),
      mediaUrl: mediaUrl.isEmpty ? null : mediaUrl,
      displayOrder: asInt(json['displayOrder']),
      createdAt: asDateTimeOrNull(json['createdAt']),
    );
  }
}
