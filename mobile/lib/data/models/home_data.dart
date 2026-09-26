import 'article.dart';
import 'club.dart';
import 'json_utils.dart';
import 'match.dart';

/// Aggregated home payload — maps `GET /api/home`
/// `{ club, nextMatch, recentMatches[], news[], content{} }`.
///
/// `club` and `nextMatch` can be absent/null; `content` is a free-form
/// key/value bag of site copy.
class HomeData {
  const HomeData({
    this.club,
    this.nextMatch,
    required this.recentMatches,
    required this.news,
    required this.content,
  });

  final Club? club;
  final Match? nextMatch;
  final List<Match> recentMatches;
  final List<Article> news;
  final Map<String, String> content;

  factory HomeData.fromJson(Map<String, dynamic> json) {
    final rawClub = json['club'];
    final rawNextMatch = json['nextMatch'];
    final rawContent = json['content'];

    return HomeData(
      club: rawClub is Map
          ? Club.fromJson(Map<String, dynamic>.from(rawClub))
          : null,
      nextMatch: rawNextMatch is Map
          ? Match.fromJson(Map<String, dynamic>.from(rawNextMatch))
          : null,
      recentMatches: asList(json['recentMatches'], Match.fromJson),
      news: asList(json['news'], Article.fromJson),
      content: rawContent is Map
          ? rawContent.map(
              (key, value) => MapEntry(key.toString(), value?.toString() ?? ''),
            )
          : <String, String>{},
    );
  }
}
