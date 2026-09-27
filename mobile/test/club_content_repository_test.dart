import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/repositories/club_content_repository.dart';

void main() {
  const baseUrl = 'https://api.example.test/api';
  late List<Uri> requested;

  /// A repository whose HTTP client records each URL and answers [body]
  /// (JSON-encoded) with [status].
  ClubContentRepository repositoryAnswering(Object? body, {int status = 200}) {
    requested = <Uri>[];
    return ClubContentRepository(
      ApiClient(
        baseUrl: baseUrl,
        httpClient: MockClient((request) async {
          requested.add(request.url);
          return http.Response(
            jsonEncode(body),
            status,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      ),
    );
  }

  group('ClubContentRepository', () {
    test('getEvents calls GET /events and decodes the list', () async {
      final repo = repositoryAnswering([
        {
          'id': 'e1',
          'title': 'Fête du club',
          'slug': 'fete-du-club',
          'description': null,
          'startAt': '2026-07-14T18:00:00+00:00',
          'endAt': null,
          'location': 'Place de la mairie',
        },
      ]);

      final events = await repo.getEvents();

      expect(requested.single.toString(), '$baseUrl/events');
      expect(events.single.slug, 'fete-du-club');
      expect(events.single.location, 'Place de la mairie');
    });

    test('getEvent calls GET /events/{slug}', () async {
      final repo = repositoryAnswering({
        'id': 'e1',
        'title': 'Fête du club',
        'slug': 'fete-du-club',
        'startAt': '2026-07-14T18:00:00+00:00',
      });

      final event = await repo.getEvent('fete-du-club');

      expect(requested.single.toString(), '$baseUrl/events/fete-du-club');
      expect(event.title, 'Fête du club');
    });

    test('getEvent throws NotFoundException on 404', () async {
      final repo = repositoryAnswering({'message': 'Not found'}, status: 404);

      await expectLater(
        repo.getEvent('evenement-supprime'),
        throwsA(isA<NotFoundException>()),
      );
    });

    test('getDocuments sends the optional category filter', () async {
      final repo = repositoryAnswering([
        {
          'id': 'd1',
          'title': 'Règlement intérieur',
          'category': 'Règlement',
          'fileUrl': '/uploads/documents/reglement.pdf',
          'createdAt': '2026-03-02T09:30:00+00:00',
        },
      ]);

      final all = await repo.getDocuments();
      expect(requested.last.toString(), '$baseUrl/documents');
      expect(all.single.title, 'Règlement intérieur');

      await repo.getDocuments(category: 'Règlement');
      expect(requested.last.path, '/api/documents');
      expect(requested.last.queryParameters, {'category': 'Règlement'});

      await repo.getDocuments(category: '   ');
      expect(requested.last.hasQuery, isFalse);
    });

    test('getFaq sends the optional category filter', () async {
      final repo = repositoryAnswering(<Object>[]);

      await repo.getFaq();
      expect(requested.last.toString(), '$baseUrl/faq');

      await repo.getFaq(category: ' Billetterie ');
      expect(requested.last.queryParameters, {'category': 'Billetterie'});
    });

    test('getArchive sends the optional year and category filters', () async {
      final repo = repositoryAnswering([
        {
          'id': 'a1',
          'year': 2019,
          'category': 'Trophy',
          'title': 'Coupe régionale',
          'body': 'Victoire historique.',
          'mediaAssetId': null,
          'mediaUrl': null,
          'displayOrder': 0,
          'createdAt': '2026-01-10T08:00:00+00:00',
        },
      ]);

      final items = await repo.getArchive();
      expect(requested.last.toString(), '$baseUrl/archive');
      expect(items.single.year, 2019);

      await repo.getArchive(year: 2019, category: 'Trophy');
      expect(requested.last.queryParameters, {
        'year': '2019',
        'category': 'Trophy',
      });

      await repo.getArchive(category: 'Photo');
      expect(requested.last.queryParameters, {'category': 'Photo'});
    });

    test('getCommunityPrograms calls GET /community-programs', () async {
      final repo = repositoryAnswering([
        {
          'id': 'c1',
          'title': 'Journée portes ouvertes',
          'partnerName': 'École primaire de Oudhref',
          'description': 'Initiation au football.',
          'startDate': '2026-04-01T00:00:00+00:00',
          'endDate': null,
        },
      ]);

      final programs = await repo.getCommunityPrograms();

      expect(requested.single.toString(), '$baseUrl/community-programs');
      expect(programs.single.partnerName, 'École primaire de Oudhref');
      expect(programs.single.endDate, isNull);
    });

    test('an unexpected payload shape decodes to an empty list', () async {
      final repo = repositoryAnswering({'unexpected': true});

      expect(await repo.getEvents(), isEmpty);
      expect(await repo.getFaq(), isEmpty);
    });

    test('server errors propagate as ApiHttpException', () async {
      final repo = repositoryAnswering({'message': 'Boom'}, status: 500);

      await expectLater(
        repo.getCommunityPrograms(),
        throwsA(
          isA<ApiHttpException>().having((e) => e.statusCode, 'status', 500),
        ),
      );
    });
  });
}
