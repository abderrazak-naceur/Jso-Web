import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/data/models/admin_fan_account.dart';

void main() {
  group('AdminFanAccount', () {
    test('parses account state and VIP rating from the admin API', () {
      final account = AdminFanAccount.fromJson({
        'id': 'fan-1',
        'email': 'supporter@jso.tn',
        'displayName': 'Supporter JSO',
        'isActive': true,
        'fanRatingStars': 5,
        'isVip': true,
        'emailVerified': true,
        'createdAt': '2026-09-01T10:00:00Z',
        'lastLoginAt': '2026-10-01T10:00:00Z',
      });

      expect(account.id, 'fan-1');
      expect(account.email, 'supporter@jso.tn');
      expect(account.isActive, isTrue);
      expect(account.fanRatingStars, 5);
      expect(account.isVip, isTrue);
      expect(account.emailVerified, isTrue);
      expect(account.createdAt, DateTime.parse('2026-09-01T10:00:00Z'));
      expect(account.lastLoginAt, DateTime.parse('2026-10-01T10:00:00Z'));
    });

    test('falls back to one star for an unsupported rating', () {
      final account = AdminFanAccount.fromJson({
        'id': 'fan-2',
        'email': 'fan@jso.tn',
        'displayName': 'Fan',
        'isActive': false,
        'fanRatingStars': 4,
        'isVip': false,
      });

      expect(account.fanRatingStars, 1);
      expect(account.isActive, isFalse);
    });

    test('copyWith updates state without losing account identity', () {
      final account = AdminFanAccount.fromJson({
        'id': 'fan-3',
        'email': 'fan@jso.tn',
        'displayName': 'Fan',
        'isActive': true,
        'fanRatingStars': 1,
        'isVip': false,
      });

      final updated = account.copyWith(
        isActive: false,
        fanRatingStars: 3,
        isVip: true,
      );

      expect(updated.id, account.id);
      expect(updated.isActive, isFalse);
      expect(updated.fanRatingStars, 3);
      expect(updated.isVip, isTrue);
    });
  });
}
