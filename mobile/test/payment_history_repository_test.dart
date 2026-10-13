import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/data/repositories/payment_history_repository.dart';

void main() {
  test(
    'mine loads authenticated ticket payments and maps charged values',
    () async {
      const baseUrl = 'https://api.example.test/api';
      http.Request? requested;
      final repository = PaymentHistoryRepository(
        ApiClient(
          baseUrl: baseUrl,
          httpClient: MockClient((request) async {
            requested = request;
            return http.Response(
              jsonEncode([
                {
                  'id': 'ticket-1',
                  'type': 'ticket',
                  'description': 'Billet · Tribune principale',
                  'status': 'Confirmed',
                  'amount': 8.5,
                  'currency': 'EUR',
                  'provider': 'Stripe',
                  'createdAt': '2026-10-14T10:00:00Z',
                  'paidAt': '2026-10-14T10:02:00Z',
                },
              ]),
              200,
              headers: {'content-type': 'application/json'},
            );
          }),
        ),
      );

      final items = await repository.mine('fan-jwt');

      expect(requested!.url.toString(), '$baseUrl/account/me/payments');
      expect(requested!.headers['authorization'], 'Bearer fan-jwt');
      expect(items, hasLength(1));
      expect(items.single.type, 'ticket');
      expect(items.single.description, 'Billet · Tribune principale');
      expect(items.single.statusLabel, 'Payé');
      expect(items.single.amount, 8.5);
      expect(items.single.currency, 'EUR');
      expect(items.single.provider, 'Stripe');
      expect(items.single.paidAt, DateTime.utc(2026, 10, 14, 10, 2));
    },
  );
}
