import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/article.dart';
import 'package:jso_mobile/data/models/home_data.dart';
import 'package:jso_mobile/data/models/match.dart';
import 'package:jso_mobile/data/models/match_event.dart';
import 'package:jso_mobile/data/models/media_asset.dart';
import 'package:jso_mobile/data/repositories/public_api_repository.dart';

/// A test double for [PublicApiRepository] that never touches the network.
///
/// Each method resolves from an injected value/error and, when [delay] is set,
/// stays pending long enough for a test to observe the LOADING state before
/// the future completes. Errors default to a [NetworkException] so screens
/// exercise their ERROR branch.
class FakeRepository extends PublicApiRepository {
  FakeRepository({
    this.homeData,
    this.matches,
    this.match,
    this.matchEvents,
    this.news,
    this.newsArticle,
    this.media,
    this.error,
    this.delay,
  }) : super(ApiClient());

  final HomeData? homeData;
  final List<Match>? matches;
  final Match? match;
  final List<MatchEvent>? matchEvents;
  final List<Article>? news;
  final ArticleDetail? newsArticle;
  final List<MediaAsset>? media;

  /// When set, every method throws this instead of returning a value.
  final ApiException? error;

  /// Optional artificial latency so tests can assert the LOADING state.
  final Duration? delay;

  Future<T> _resolve<T>(T Function() value) async {
    if (delay != null) {
      await Future<void>.delayed(delay!);
    }
    if (error != null) {
      throw error!;
    }
    return value();
  }

  @override
  Future<HomeData> getHome() => _resolve(() => homeData!);

  @override
  Future<List<Match>> getMatches() => _resolve(() => matches ?? const []);

  @override
  Future<Match> getMatch(String id) => _resolve(() => match!);

  @override
  Future<List<MatchEvent>> getMatchEvents(String id) =>
      _resolve(() => matchEvents ?? const []);

  @override
  Future<List<Article>> getNews() => _resolve(() => news ?? const []);

  @override
  Future<ArticleDetail> getNewsArticle(String slug) =>
      _resolve(() => newsArticle!);

  @override
  Future<List<MediaAsset>> getMedia() => _resolve(() => media ?? const []);
}
