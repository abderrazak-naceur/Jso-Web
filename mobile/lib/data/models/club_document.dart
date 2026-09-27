import 'json_utils.dart';

/// The kind of file behind a [ClubDocument], derived from its URL extension.
enum ClubDocumentKind { pdf, image, other }

/// Downloadable club document (communiqué, règlement, formulaire...) — maps
/// an item of `GET /api/documents`: id, title, category, fileUrl, createdAt.
///
/// [fileUrl] may be root-relative (`/uploads/...`, served by the API host):
/// resolve it with `ApiConfig.resolveUrl` before opening it. [category] is
/// optional server-side; blank values are normalised to null.
class ClubDocument {
  const ClubDocument({
    required this.id,
    required this.title,
    required this.fileUrl,
    this.category,
    this.createdAt,
  });

  final String id;
  final String title;
  final String fileUrl;
  final String? category;
  final DateTime? createdAt;

  static const List<String> _imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.heic',
    '.bmp',
  ];

  /// File kind from the URL path extension (query string and fragment
  /// ignored), used to pick the tile icon.
  ClubDocumentKind get kind {
    final path = (Uri.tryParse(fileUrl)?.path ?? fileUrl).toLowerCase();
    if (path.endsWith('.pdf')) return ClubDocumentKind.pdf;
    if (_imageExtensions.any(path.endsWith)) return ClubDocumentKind.image;
    return ClubDocumentKind.other;
  }

  factory ClubDocument.fromJson(Map<String, dynamic> json) {
    final category = asString(json['category']).trim();
    return ClubDocument(
      id: asString(json['id']),
      title: asString(json['title']),
      fileUrl: asString(json['fileUrl']).trim(),
      category: category.isEmpty ? null : category,
      createdAt: asDateTimeOrNull(json['createdAt']),
    );
  }
}
