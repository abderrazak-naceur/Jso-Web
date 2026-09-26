import '../../core/api/api_client.dart';
import '../models/article.dart';
import '../models/club.dart';
import '../models/home_data.dart';
import '../models/match.dart';
import '../models/match_event.dart';
import '../models/media_asset.dart';
import '../models/player.dart';
import '../models/sponsor.dart';
import '../models/team.dart';

/// Repository over the public JSO REST API.
///
/// Each method maps to a real route (see `backend/src/JSO.Api/Controllers`)
/// and decodes into typed models. Typed [ApiException]s from [ApiClient]
/// propagate to callers so screens can render error states.
class PublicApiRepository {
  PublicApiRepository(this._client);

  final ApiClient _client;

  /// `GET /api/home`
  Future<HomeData> getHome() async {
    final json = await _client.getJson('/home');
    return HomeData.fromJson(_asMap(json));
  }

  /// `GET /api/club`
  Future<Club> getClub() async {
    final json = await _client.getJson('/club');
    return Club.fromJson(_asMap(json));
  }

  /// `GET /api/matches`
  Future<List<Match>> getMatches() async {
    final json = await _client.getJson('/matches');
    return _mapList(json, Match.fromJson);
  }

  /// `GET /api/matches/{id}`
  Future<Match> getMatch(String id) async {
    final json = await _client.getJson('/matches/$id');
    return Match.fromJson(_asMap(json));
  }

  /// `GET /api/matches/{id}/events`
  Future<List<MatchEvent>> getMatchEvents(String id) async {
    final json = await _client.getJson('/matches/$id/events');
    return _mapList(json, MatchEvent.fromJson);
  }

  /// `GET /api/news`
  Future<List<Article>> getNews() async {
    final json = await _client.getJson('/news');
    return _mapList(json, Article.fromJson);
  }

  /// `GET /api/news/{slug}` -> `{ article, metadata }`
  Future<ArticleDetail> getNewsArticle(String slug) async {
    final json = await _client.getJson('/news/$slug');
    return ArticleDetail.fromJson(_asMap(json));
  }

  /// `GET /api/media`
  Future<List<MediaAsset>> getMedia() async {
    final json = await _client.getJson('/media');
    return _mapList(json, MediaAsset.fromJson);
  }

  /// `GET /api/teams`
  Future<List<Team>> getTeams() async {
    final json = await _client.getJson('/teams');
    return _mapList(json, Team.fromJson);
  }

  /// `GET /api/teams/{id}/players`
  Future<List<Player>> getTeamPlayers(String id) async {
    final json = await _client.getJson('/teams/$id/players');
    return _mapList(json, Player.fromJson);
  }

  /// `GET /api/sponsors[?placement=]`
  Future<List<Sponsor>> getSponsors({String? placement}) async {
    final json = await _client.getJson(
      '/sponsors',
      queryParameters: (placement != null && placement.isNotEmpty)
          ? {'placement': placement}
          : null,
    );
    return _mapList(json, Sponsor.fromJson);
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};

  List<T> _mapList<T>(Object? json, T Function(Map<String, dynamic>) fromJson) {
    if (json is! List) return <T>[];
    return json
        .whereType<Map>()
        .map((e) => fromJson(Map<String, dynamic>.from(e)))
        .toList(growable: false);
  }
}
