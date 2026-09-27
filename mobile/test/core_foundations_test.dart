import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/core/api/error_text.dart';
import 'package:jso_mobile/core/config/api_config.dart';
import 'package:jso_mobile/shared/format.dart';

void main() {
  group('JsoFormat (French)', () {
    // Local wall-clock values so the assertions hold in any test timezone.
    final kickoff = DateTime(2026, 3, 15, 18, 30); // a Sunday

    test('formats dates and times in French', () {
      expect(JsoFormat.date(kickoff), '15 mars 2026');
      expect(JsoFormat.dateTime(kickoff), 'dim. 15 mars 2026 · 18:30');
      expect(JsoFormat.time(kickoff), '18:30');
    });

    test('formats same-day and multi-day ranges', () {
      expect(
        JsoFormat.dateRange(kickoff, DateTime(2026, 3, 15, 20)),
        '15 mars 2026 · 18:30 – 20:00',
      );
      expect(
        JsoFormat.dateRange(kickoff, DateTime(2026, 8, 17, 9)),
        '15 mars 2026 – 17 août 2026',
      );
      expect(JsoFormat.dateRange(kickoff, null), '15 mars 2026 · 18:30');
    });

    test('maps match statuses to French and keeps unknown ones', () {
      expect(JsoFormat.matchStatus('Scheduled'), 'À venir');
      expect(JsoFormat.matchStatus('Finished'), 'Terminé');
      expect(JsoFormat.matchStatus('Live'), 'En direct');
      expect(JsoFormat.matchStatus('Abandoned'), 'Abandoned');
    });

    test('formats money with the currency code', () {
      expect(JsoFormat.money(25, 'TND'), '25.00 TND');
    });
  });

  group('ApiConfig.resolveUrl', () {
    const base = 'http://10.0.2.2:5000/api';

    test('joins a root-relative upload path to the API origin', () {
      expect(
        ApiConfig.resolveUrl('/uploads/media/2026/03/a.jpg', base: base),
        'http://10.0.2.2:5000/uploads/media/2026/03/a.jpg',
      );
    });

    test('joins a relative path without a leading slash', () {
      expect(
        ApiConfig.resolveUrl('uploads/doc.pdf', base: base),
        'http://10.0.2.2:5000/uploads/doc.pdf',
      );
    });

    test('keeps absolute URLs unchanged', () {
      expect(
        ApiConfig.resolveUrl('https://cdn.example.tn/x.png', base: base),
        'https://cdn.example.tn/x.png',
      );
    });

    test('returns null for blank values', () {
      expect(ApiConfig.resolveUrl(null, base: base), isNull);
      expect(ApiConfig.resolveUrl('   ', base: base), isNull);
    });

    test('returns the value as-is when the base has no host', () {
      expect(
        ApiConfig.resolveUrl('/uploads/a.jpg', base: '/api'),
        '/uploads/a.jpg',
      );
    });
  });

  group('describeApiError', () {
    test('translates known backend messages to French', () {
      expect(
        describeApiError(
          const ApiHttpException(400, 'x', serverMessage: 'The cart is empty.'),
        ),
        'Le panier est vide.',
      );
    });

    test('translates the dynamic stock message', () {
      expect(
        describeApiError(
          const ApiHttpException(
            400,
            'x',
            serverMessage: "Not enough stock for 'Maillot domicile'.",
          ),
        ),
        'Stock insuffisant pour « Maillot domicile ».',
      );
    });

    test('passes through unknown (French) server messages', () {
      expect(
        describeApiError(
          const ApiHttpException(
            400,
            'x',
            serverMessage: 'Une adresse e-mail valide est requise.',
          ),
        ),
        'Une adresse e-mail valide est requise.',
      );
    });

    test('falls back to a French message per status code', () {
      expect(
        describeApiError(const ApiHttpException(429, 'x')),
        'Trop de tentatives. Réessayez dans un instant.',
      );
      expect(
        describeApiError(const ApiHttpException(503, 'x')),
        'Le serveur rencontre un problème. Réessayez plus tard.',
      );
      expect(
        describeApiError(const ApiHttpException(401, 'x')),
        'Votre session a expiré. Reconnectez-vous.',
      );
    });

    test('maps transport failures to French', () {
      expect(
        describeApiError(const NetworkException()),
        'Connexion impossible. Vérifiez votre réseau.',
      );
      expect(
        describeApiError(const ApiTimeoutException()),
        'Le serveur met trop de temps à répondre.',
      );
      expect(
        describeApiError(const NotFoundException()),
        'Contenu introuvable.',
      );
      expect(
        describeApiError(StateError('boom')),
        'Une erreur est survenue. Veuillez réessayer.',
      );
    });
  });
}
