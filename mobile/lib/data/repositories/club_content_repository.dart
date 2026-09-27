import '../../core/api/api_client.dart';
import '../models/archive_item.dart';
import '../models/club_document.dart';
import '../models/club_event.dart';
import '../models/community_program.dart';
import '../models/faq_entry.dart';
import '../models/json_utils.dart';

/// Repository over the public "Vie du club" endpoints of the JSO API, in
/// `backend/src/JSO.Api/Controllers`: the club agenda
/// (`ClubEventsController`), downloadable documents (`DocumentsController`),
/// the FAQ (`FaqController`), the digital museum (`ArchiveController`) and
/// the schools & partners programmes (`CommunityProgramsController`).
///
/// Every route is anonymous, read-only and only returns published content.
/// Typed `ApiException`s from [ApiClient] propagate so screens can render
/// their error states (e.g. `NotFoundException` for an unknown event slug).
class ClubContentRepository {
  ClubContentRepository(this._client);

  final ApiClient _client;

  /// `GET /api/events` — published club events, ordered by `startAt`
  /// ascending.
  Future<List<ClubEvent>> getEvents() async {
    final json = await _client.getJson('/events');
    return asList(json, ClubEvent.fromJson);
  }

  /// `GET /api/events/{slug}` — a single published event. Throws
  /// `NotFoundException` when the slug is unknown or no longer published.
  Future<ClubEvent> getEvent(String slug) async {
    final json = await _client.getJson('/events/${Uri.encodeComponent(slug)}');
    return ClubEvent.fromJson(_asMap(json));
  }

  /// `GET /api/documents[?category=]` — published documents, newest first.
  Future<List<ClubDocument>> getDocuments({String? category}) async {
    final json = await _client.getJson(
      '/documents',
      queryParameters: _query({'category': category}),
    );
    return asList(json, ClubDocument.fromJson);
  }

  /// `GET /api/faq[?category=]` — published entries ordered by `sortOrder`
  /// then creation date.
  Future<List<FaqEntry>> getFaq({String? category}) async {
    final json = await _client.getJson(
      '/faq',
      queryParameters: _query({'category': category}),
    );
    return asList(json, FaqEntry.fromJson);
  }

  /// `GET /api/archive[?year=&category=]` — published museum items: undated
  /// items first, then by year descending, then by `displayOrder`.
  Future<List<ArchiveItem>> getArchive({int? year, String? category}) async {
    final json = await _client.getJson(
      '/archive',
      queryParameters: _query({'year': year?.toString(), 'category': category}),
    );
    return asList(json, ArchiveItem.fromJson);
  }

  /// `GET /api/community-programs` — published programmes with local schools
  /// and partners, ordered by start date (no partner contact data).
  Future<List<CommunityProgram>> getCommunityPrograms() async {
    final json = await _client.getJson('/community-programs');
    return asList(json, CommunityProgram.fromJson);
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};

  /// Query parameters without null/blank values; null when nothing is left so
  /// the request URL stays bare.
  Map<String, String>? _query(Map<String, String?> params) {
    final query = <String, String>{
      for (final entry in params.entries)
        if (entry.value != null && entry.value!.trim().isNotEmpty)
          entry.key: entry.value!.trim(),
    };
    return query.isEmpty ? null : query;
  }
}
