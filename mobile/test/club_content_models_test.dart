import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/data/models/archive_item.dart';
import 'package:jso_mobile/data/models/club_document.dart';
import 'package:jso_mobile/data/models/club_event.dart';
import 'package:jso_mobile/data/models/community_program.dart';
import 'package:jso_mobile/data/models/faq_entry.dart';

Map<String, dynamic> _json(String source) =>
    jsonDecode(source) as Map<String, dynamic>;

void main() {
  group('ClubEvent.fromJson', () {
    test('parses a published event (GET /api/events item)', () {
      final event = ClubEvent.fromJson(
        _json('''
        {
          "id": "0b3c1e52-5f0e-4a57-9d51-6a1f0c2b7e11",
          "title": "Assemblée générale ordinaire",
          "slug": "assemblee-generale-2026",
          "description": "Bilan moral et financier de la saison 2025-2026.",
          "startAt": "2026-06-20T17:00:00+00:00",
          "endAt": "2026-06-20T19:30:00+00:00",
          "location": "Salle omnisports de Oudhref"
        }
        '''),
      );

      expect(event.id, '0b3c1e52-5f0e-4a57-9d51-6a1f0c2b7e11');
      expect(event.title, 'Assemblée générale ordinaire');
      expect(event.slug, 'assemblee-generale-2026');
      expect(
        event.description,
        'Bilan moral et financier de la saison 2025-2026.',
      );
      expect(event.startAt.toUtc(), DateTime.utc(2026, 6, 20, 17));
      expect(event.endAt!.toUtc(), DateTime.utc(2026, 6, 20, 19, 30));
      expect(event.endsAt, event.endAt);
      expect(event.location, 'Salle omnisports de Oudhref');
    });

    test('tolerates null endAt/description and a blank location', () {
      final event = ClubEvent.fromJson(
        _json('''
        {
          "id": "5d8a7c10-2b1e-4f7a-8c3d-9e0f1a2b3c4d",
          "title": "Entraînement ouvert",
          "slug": "entrainement-ouvert",
          "description": null,
          "startAt": "2026-04-12T08:30:00+01:00",
          "endAt": null,
          "location": "   "
        }
        '''),
      );

      expect(event.endAt, isNull);
      expect(event.description, isNull);
      expect(event.location, isNull);
      expect(event.startAt.toUtc(), DateTime.utc(2026, 4, 12, 7, 30));
      expect(event.endsAt, event.startAt);
    });

    test('isUpcomingAt compares (endAt ?? startAt) with now', () {
      final now = DateTime.utc(2026, 5, 1, 12);
      ClubEvent at(DateTime start, [DateTime? end]) => ClubEvent(
        id: 'e',
        title: 'Fête du club',
        slug: 'fete-du-club',
        startAt: start,
        endAt: end,
      );

      // In progress: started an hour ago, ends in two hours.
      expect(
        at(
          now.subtract(const Duration(hours: 1)),
          now.add(const Duration(hours: 2)),
        ).isUpcomingAt(now),
        isTrue,
      );
      expect(at(now.add(const Duration(minutes: 5))).isUpcomingAt(now), isTrue);
      expect(
        at(now.subtract(const Duration(minutes: 5))).isUpcomingAt(now),
        isFalse,
      );
      expect(at(now).isUpcomingAt(now), isFalse);
    });
  });

  group('ClubDocument.fromJson', () {
    test('parses a document with a root-relative fileUrl', () {
      final document = ClubDocument.fromJson(
        _json('''
        {
          "id": "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
          "title": "Règlement intérieur 2026",
          "category": "Règlement",
          "fileUrl": "/uploads/documents/2026/03/reglement-interieur.pdf",
          "createdAt": "2026-03-02T09:30:12.1234567+00:00"
        }
        '''),
      );

      expect(document.id, '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d');
      expect(document.title, 'Règlement intérieur 2026');
      expect(document.category, 'Règlement');
      expect(
        document.fileUrl,
        '/uploads/documents/2026/03/reglement-interieur.pdf',
      );
      expect(
        document.createdAt!.toUtc(),
        DateTime.utc(2026, 3, 2, 9, 30, 12, 123, 456),
      );
      expect(document.kind, ClubDocumentKind.pdf);
    });

    test('tolerates a null category and a missing createdAt', () {
      final document = ClubDocument.fromJson(
        _json('''
        {
          "id": "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
          "title": "Fiche d'inscription école de foot",
          "category": null,
          "fileUrl": "https://cdn.jso.example.tn/docs/inscription.docx"
        }
        '''),
      );

      expect(document.category, isNull);
      expect(document.createdAt, isNull);
      expect(document.kind, ClubDocumentKind.other);
    });

    test('kind is derived from the URL path extension', () {
      ClubDocumentKind kindOf(String url) =>
          ClubDocument(id: 'd', title: 'Doc', fileUrl: url).kind;

      expect(kindOf('/uploads/doc.pdf?v=2#page=3'), ClubDocumentKind.pdf);
      expect(
        kindOf('https://cdn.example.tn/COMMUNIQUE.PDF'),
        ClubDocumentKind.pdf,
      );
      expect(kindOf('/uploads/affiche.jpg'), ClubDocumentKind.image);
      expect(kindOf('/uploads/affiche.jpeg'), ClubDocumentKind.image);
      expect(kindOf('/uploads/plan-stade.png'), ClubDocumentKind.image);
      expect(kindOf('/uploads/logo.webp'), ClubDocumentKind.image);
      expect(kindOf('/uploads/bilan.xlsx'), ClubDocumentKind.other);
      expect(
        kindOf('https://drive.example.tn/file/abc'),
        ClubDocumentKind.other,
      );
      expect(kindOf(''), ClubDocumentKind.other);
    });
  });

  group('FaqEntry.fromJson', () {
    test('parses an entry (GET /api/faq item)', () {
      final entry = FaqEntry.fromJson(
        _json('''
        {
          "id": "3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7",
          "question": "Comment adhérer au club ?",
          "answer": "Remplissez la fiche d'adhésion\\npuis passez au secrétariat.",
          "category": "Adhésion",
          "sortOrder": 2
        }
        '''),
      );

      expect(entry.id, '3e4f5a6b-7c8d-4e9f-a0b1-c2d3e4f5a6b7');
      expect(entry.question, 'Comment adhérer au club ?');
      expect(
        entry.answer,
        'Remplissez la fiche d\'adhésion\npuis passez au secrétariat.',
      );
      expect(entry.category, 'Adhésion');
      expect(entry.sortOrder, 2);
    });

    test('tolerates a null category and a missing sortOrder', () {
      final entry = FaqEntry.fromJson(
        _json('''
        {
          "id": "4f5a6b7c-8d9e-4f0a-b1c2-d3e4f5a6b7c8",
          "question": "Où se trouve le stade ?",
          "answer": "Route de Gabès, Oudhref.",
          "category": null
        }
        '''),
      );

      expect(entry.category, isNull);
      expect(entry.sortOrder, 0);
    });
  });

  group('ArchiveItem.fromJson', () {
    test('parses a dated item with its resolved media URL', () {
      final item = ArchiveItem.fromJson(
        _json('''
        {
          "id": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
          "year": 2019,
          "category": "Trophy",
          "title": "Coupe régionale 2019",
          "body": "La JSO remporte la coupe régionale face à l'US Ben Arous.",
          "mediaAssetId": "7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f",
          "mediaUrl": "/uploads/media/2019/05/coupe.jpg",
          "displayOrder": 1,
          "createdAt": "2026-01-10T08:00:00+00:00"
        }
        '''),
      );

      expect(item.id, '6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e');
      expect(item.year, 2019);
      expect(item.category, 'Trophy');
      expect(item.title, 'Coupe régionale 2019');
      expect(
        item.body,
        'La JSO remporte la coupe régionale face à l\'US Ben Arous.',
      );
      expect(item.mediaAssetId, '7c8d9e0f-1a2b-4c3d-8e4f-5a6b7c8d9e0f');
      expect(item.mediaUrl, '/uploads/media/2019/05/coupe.jpg');
      expect(item.displayOrder, 1);
      expect(item.createdAt!.toUtc(), DateTime.utc(2026, 1, 10, 8));
    });

    test('tolerates a null year and no media', () {
      final item = ArchiveItem.fromJson(
        _json('''
        {
          "id": "8d9e0f1a-2b3c-4d4e-9f5a-6b7c8d9e0f1a",
          "year": null,
          "category": "Milestone",
          "title": "Les couleurs du club",
          "body": "Pourquoi le bleu et l'or ?",
          "mediaAssetId": null,
          "mediaUrl": null,
          "displayOrder": 0,
          "createdAt": "2026-01-11T10:00:00+00:00"
        }
        '''),
      );

      expect(item.year, isNull);
      expect(item.mediaAssetId, isNull);
      expect(item.mediaUrl, isNull);
      expect(item.category, 'Milestone');
    });
  });

  group('CommunityProgram.fromJson', () {
    test('parses a programme with an end date', () {
      final program = CommunityProgram.fromJson(
        _json('''
        {
          "id": "9e0f1a2b-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
          "title": "Cycle foot à l'école",
          "partnerName": "École primaire de Oudhref",
          "description": "Séances d'initiation chaque mercredi après-midi.",
          "startDate": "2026-04-01T00:00:00+00:00",
          "endDate": "2026-06-30T00:00:00+00:00"
        }
        '''),
      );

      expect(program.id, '9e0f1a2b-3c4d-4e5f-a6b7-c8d9e0f1a2b3');
      expect(program.title, 'Cycle foot à l\'école');
      expect(program.partnerName, 'École primaire de Oudhref');
      expect(
        program.description,
        'Séances d\'initiation chaque mercredi après-midi.',
      );
      expect(program.startDate.toUtc(), DateTime.utc(2026, 4, 1));
      expect(program.endDate!.toUtc(), DateTime.utc(2026, 6, 30));
    });

    test('tolerates a null end date and description', () {
      final program = CommunityProgram.fromJson(
        _json('''
        {
          "id": "0f1a2b3c-4d5e-4f6a-b7c8-d9e0f1a2b3c4",
          "title": "Tournoi de quartier",
          "partnerName": "Association Jeunesse d'Oudhref",
          "description": null,
          "startDate": "2025-09-15T00:00:00+00:00",
          "endDate": null
        }
        '''),
      );

      expect(program.endDate, isNull);
      expect(program.description, isEmpty);
      expect(program.startDate.toUtc(), DateTime.utc(2025, 9, 15));
    });
  });
}
