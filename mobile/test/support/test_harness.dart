import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/data/models/article.dart';
import 'package:jso_mobile/data/models/club.dart';
import 'package:jso_mobile/data/models/home_data.dart';
import 'package:jso_mobile/data/models/match.dart';
import 'package:jso_mobile/data/models/match_event.dart';
import 'package:jso_mobile/data/models/media_asset.dart';
import 'package:jso_mobile/data/models/player.dart';
import 'package:jso_mobile/data/models/sponsor.dart';
import 'package:jso_mobile/data/models/team.dart';
import 'package:jso_mobile/data/repositories/public_api_repository.dart';

/// Pumps [child] inside a MaterialApp with the JSO theme and a Provider that
/// supplies [repository]. Mirrors how the real app wires the tree.
Future<void> pumpScreen(
  WidgetTester tester, {
  required PublicApiRepository repository,
  required Widget child,
}) {
  return tester.pumpWidget(
    Provider<PublicApiRepository>.value(
      value: repository,
      child: MaterialApp(theme: JsoTheme.dark(), home: child),
    ),
  );
}

/// Sample data factories used across the screen tests.
class Sample {
  const Sample._();

  static Match match({
    String id = '8f2c5f3a-1c2d-4b0e-9c11-1a2b3c4d5e6f',
    String opponent = 'CS Sfaxien',
    bool isHome = true,
    int? homeScore = 2,
    int? awayScore = 1,
    String status = 'Finished',
  }) {
    return Match(
      id: id,
      seasonId: 's',
      competitionId: 'c',
      teamId: 't',
      opponentName: opponent,
      kickoffAt: DateTime.utc(2026, 3, 15, 18, 30),
      venue: 'Stade de Oudhref',
      isHome: isHome,
      homeScore: homeScore,
      awayScore: awayScore,
      status: status,
    );
  }

  static Article article({
    String title = 'Victoire à domicile',
    String slug = 'victoire-a-domicile',
  }) {
    return Article(
      id: 'a1',
      title: title,
      slug: slug,
      excerpt: 'Résumé du match.',
      body: 'Compte rendu complet.',
      status: 'Published',
      publishedAt: DateTime.utc(2026, 3, 16, 9),
    );
  }

  static ArticleDetail articleDetail() =>
      ArticleDetail(article: article(), metadata: const {'ogTitle': 'JSO'});

  static MatchEvent event({int minute = 23, String type = 'Goal'}) {
    return MatchEvent(
      id: 'e1',
      matchId: '8f2c5f3a-1c2d-4b0e-9c11-1a2b3c4d5e6f',
      minute: minute,
      type: type,
      playerName: 'Ali Ben Salah',
    );
  }

  static MediaAsset media({String type = 'Image', String title = 'Matchday'}) {
    return MediaAsset(
      id: 'm1',
      title: title,
      url: 'https://jso.example.tn/media/1.jpg',
      type: type,
      thumbnailUrl: 'https://jso.example.tn/media/1-thumb.jpg',
      caption: 'Ambiance',
      createdAt: DateTime.utc(2026, 3, 1, 12),
    );
  }

  static Team team({
    String id = 't1',
    String name = 'Séniors',
    String category = 'Senior',
    bool isActive = true,
    int playersCount = 22,
  }) {
    return Team(
      id: id,
      name: name,
      category: category,
      isActive: isActive,
      playersCount: playersCount,
    );
  }

  static Player player({
    String id = 'p1',
    String teamId = 't1',
    String firstName = 'Ali',
    String lastName = 'Ben Salah',
    int? shirtNumber = 10,
    String? position = 'Milieu',
    String? photoUrl,
  }) {
    return Player(
      id: id,
      teamId: teamId,
      firstName: firstName,
      lastName: lastName,
      shirtNumber: shirtNumber,
      position: position,
      photoUrl: photoUrl,
    );
  }

  static Sponsor sponsor({
    String id = 'sp1',
    String name = 'Ooredoo',
    String? logoUrl = 'https://jso.example.tn/sponsors/ooredoo.png',
    String? websiteUrl = 'https://sponsor.example.tn',
    String tier = 'Platinum',
    String placement = 'Footer',
  }) {
    return Sponsor(
      id: id,
      name: name,
      logoUrl: logoUrl,
      websiteUrl: websiteUrl,
      tier: tier,
      placement: placement,
    );
  }

  static Club club() => const Club(
    id: 'club-1',
    name: 'Jeunesse Sportive de Oudhref',
    shortName: 'JSO',
    country: 'Tunisie',
    city: 'Oudhref',
  );

  static HomeData home({bool populated = true}) {
    if (!populated) {
      return HomeData(
        club: club(),
        recentMatches: const [],
        news: const [],
        content: const {},
      );
    }
    return HomeData(
      club: club(),
      nextMatch: match(status: 'Scheduled', homeScore: null, awayScore: null),
      recentMatches: [match()],
      news: [article()],
      content: const {'hero.title': 'Bienvenue'},
    );
  }

  /// A payload whose only signal is the [content] bag: no next match, no
  /// recent matches and no news. Used to assert the "About the club" section
  /// renders (and EmptyView does not) for a content-only response.
  static HomeData homeContentOnly() {
    return HomeData(
      club: club(),
      recentMatches: const [],
      news: const [],
      content: const {'about': 'JSO is the pride of Oudhref.'},
    );
  }
}
