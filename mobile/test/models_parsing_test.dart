import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/data/models/article.dart';
import 'package:jso_mobile/data/models/home_data.dart';
import 'package:jso_mobile/data/models/match.dart';
import 'package:jso_mobile/data/models/media_asset.dart';
import 'package:jso_mobile/data/models/sponsor.dart';

void main() {
  group('Match.fromJson', () {
    test('parses a full match payload (GET /api/matches item)', () {
      final json = jsonDecode('''
      {
        "id": "8f2c5f3a-1c2d-4b0e-9c11-1a2b3c4d5e6f",
        "seasonId": "11111111-1111-1111-1111-111111111111",
        "competitionId": "22222222-2222-2222-2222-222222222222",
        "teamId": "33333333-3333-3333-3333-333333333333",
        "opponentName": "CS Sfaxien",
        "kickoffAt": "2026-03-15T18:30:00+01:00",
        "venue": "Stade de Oudhref",
        "isHome": true,
        "homeScore": 2,
        "awayScore": 1,
        "status": "Finished",
        "isPublished": true
      }
      ''') as Map<String, dynamic>;

      final match = Match.fromJson(json);

      expect(match.id, '8f2c5f3a-1c2d-4b0e-9c11-1a2b3c4d5e6f');
      expect(match.opponentName, 'CS Sfaxien');
      expect(match.isHome, isTrue);
      expect(match.homeScore, 2);
      expect(match.awayScore, 1);
      expect(match.status, 'Finished');
      expect(match.isPublished, isTrue);
      expect(match.hasResult, isTrue);
      expect(match.kickoffAt.toUtc(), DateTime.utc(2026, 3, 15, 17, 30));
    });

    test('handles the detail projection without isPublished/scores', () {
      final json = jsonDecode('''
      {
        "id": "8f2c5f3a-1c2d-4b0e-9c11-1a2b3c4d5e6f",
        "seasonId": "11111111-1111-1111-1111-111111111111",
        "competitionId": "22222222-2222-2222-2222-222222222222",
        "teamId": "33333333-3333-3333-3333-333333333333",
        "opponentName": "ES Metlaoui",
        "kickoffAt": "2026-04-01T15:00:00+01:00",
        "venue": null,
        "isHome": false,
        "homeScore": null,
        "awayScore": null,
        "status": "Scheduled"
      }
      ''') as Map<String, dynamic>;

      final match = Match.fromJson(json);

      expect(match.venue, isNull);
      expect(match.homeScore, isNull);
      expect(match.awayScore, isNull);
      expect(match.hasResult, isFalse);
      expect(match.isPublished, isNull);
    });
  });

  group('HomeData.fromJson', () {
    test('parses club, nextMatch, lists and content bag (GET /api/home)', () {
      final json = jsonDecode('''
      {
        "club": {
          "id": "44444444-4444-4444-4444-444444444444",
          "name": "Jeunesse Sportive de Oudhref",
          "shortName": "JSO",
          "country": "Tunisie",
          "city": "Oudhref",
          "description": "Club officiel",
          "logoUrl": "https://jso.example.tn/jso-club-mark.svg"
        },
        "nextMatch": {
          "id": "55555555-5555-5555-5555-555555555555",
          "seasonId": "11111111-1111-1111-1111-111111111111",
          "competitionId": "22222222-2222-2222-2222-222222222222",
          "teamId": "33333333-3333-3333-3333-333333333333",
          "opponentName": "US Monastir",
          "kickoffAt": "2026-05-10T19:00:00+01:00",
          "venue": "Stade de Oudhref",
          "isHome": true,
          "homeScore": null,
          "awayScore": null,
          "status": "Scheduled",
          "isPublished": true
        },
        "recentMatches": [
          {
            "id": "66666666-6666-6666-6666-666666666666",
            "seasonId": "11111111-1111-1111-1111-111111111111",
            "competitionId": "22222222-2222-2222-2222-222222222222",
            "teamId": "33333333-3333-3333-3333-333333333333",
            "opponentName": "Stade Tunisien",
            "kickoffAt": "2026-02-20T18:00:00+01:00",
            "venue": "Tunis",
            "isHome": false,
            "homeScore": 0,
            "awayScore": 3,
            "status": "Finished",
            "isPublished": true
          }
        ],
        "news": [
          {
            "id": "77777777-7777-7777-7777-777777777777",
            "title": "Victoire à l'extérieur",
            "slug": "victoire-a-l-exterieur",
            "excerpt": "La JSO s'impose 3-0.",
            "body": "Compte rendu complet du match.",
            "status": "Published",
            "publishedAt": "2026-02-21T09:00:00+01:00",
            "coverImageUrl": null
          }
        ],
        "content": {
          "hero.title": "Bienvenue à la JSO",
          "hero.subtitle": "Saison 2026"
        }
      }
      ''') as Map<String, dynamic>;

      final home = HomeData.fromJson(json);

      expect(home.club, isNotNull);
      expect(home.club!.shortName, 'JSO');
      expect(home.nextMatch, isNotNull);
      expect(home.nextMatch!.opponentName, 'US Monastir');
      expect(home.recentMatches, hasLength(1));
      expect(home.recentMatches.first.awayScore, 3);
      expect(home.news, hasLength(1));
      expect(home.news.first.slug, 'victoire-a-l-exterieur');
      expect(home.content['hero.title'], 'Bienvenue à la JSO');
      expect(home.content['hero.subtitle'], 'Saison 2026');
    });

    test('tolerates missing/null club and empty collections', () {
      final json = jsonDecode('''
      {
        "club": null,
        "nextMatch": null,
        "recentMatches": [],
        "news": [],
        "content": {}
      }
      ''') as Map<String, dynamic>;

      final home = HomeData.fromJson(json);

      expect(home.club, isNull);
      expect(home.nextMatch, isNull);
      expect(home.recentMatches, isEmpty);
      expect(home.news, isEmpty);
      expect(home.content, isEmpty);
    });
  });

  group('other models', () {
    test('ArticleDetail.fromJson unwraps {article, metadata}', () {
      final json = jsonDecode('''
      {
        "article": {
          "id": "88888888-8888-8888-8888-888888888888",
          "title": "Titre",
          "slug": "titre",
          "excerpt": "Extrait",
          "body": "Corps de l'article",
          "publishedAt": "2026-01-01T10:00:00+01:00",
          "coverImageUrl": "https://jso.example.tn/cover.jpg"
        },
        "metadata": { "ogTitle": "Titre OG" }
      }
      ''') as Map<String, dynamic>;

      final detail = ArticleDetail.fromJson(json);

      expect(detail.article.slug, 'titre');
      expect(detail.article.status, isNull);
      expect(detail.metadata, isNotNull);
      expect(detail.metadata!['ogTitle'], 'Titre OG');
    });

    test('MediaAsset.fromJson parses type and createdAt', () {
      final json = jsonDecode('''
      {
        "id": "99999999-9999-9999-9999-999999999999",
        "title": "Photo matchday",
        "url": "https://jso.example.tn/media/1.jpg",
        "type": "Image",
        "thumbnailUrl": null,
        "caption": "Ambiance",
        "createdAt": "2026-02-01T12:00:00+01:00"
      }
      ''') as Map<String, dynamic>;

      final asset = MediaAsset.fromJson(json);

      expect(asset.title, 'Photo matchday');
      expect(asset.type, 'Image');
      expect(asset.caption, 'Ambiance');
      expect(asset.createdAt.toUtc(), DateTime.utc(2026, 2, 1, 11));
    });

    test('Sponsor.fromJson uses fallbacks for tier/placement', () {
      final json = jsonDecode('''
      {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "name": "Sponsor Principal",
        "logoUrl": "https://jso.example.tn/sponsor.png",
        "websiteUrl": null,
        "tier": "Gold",
        "placement": "Header"
      }
      ''') as Map<String, dynamic>;

      final sponsor = Sponsor.fromJson(json);

      expect(sponsor.name, 'Sponsor Principal');
      expect(sponsor.tier, 'Gold');
      expect(sponsor.placement, 'Header');
      expect(sponsor.websiteUrl, isNull);
    });

    test('Article.fromJson from list endpoint keeps status/body', () {
      final json = jsonDecode('''
      {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "title": "Actualité",
        "slug": "actualite",
        "excerpt": "Résumé",
        "body": "Texte",
        "status": "Published",
        "publishedAt": "2026-03-01T08:00:00+01:00",
        "coverImageUrl": null
      }
      ''') as Map<String, dynamic>;

      final article = Article.fromJson(json);

      expect(article.status, 'Published');
      expect(article.body, 'Texte');
      expect(article.publishedAt, isNotNull);
    });
  });
}
