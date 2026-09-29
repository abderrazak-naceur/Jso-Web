import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/data/models/digital_ticket.dart';
import 'package:jso_mobile/data/models/ticket_order.dart';
import 'package:jso_mobile/data/models/ticket_scan_result.dart';
import 'package:jso_mobile/data/repositories/admin_tickets_repository.dart';
import 'package:jso_mobile/data/repositories/tickets_repository.dart';

void main() {
  const baseUrl = 'https://api.example.test/api';

  group('DigitalTicket.fromJson', () {
    test('parses the digital ticket payload', () {
      final json = jsonDecode('''
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "matchId": "22222222-2222-2222-2222-222222222222",
        "ticketTypeName": "Tribune",
        "quantity": 2,
        "currency": "TND",
        "total": 50.0,
        "status": "Confirmed",
        "token": "abc123DEF456",
        "issuedAt": "2026-09-29T10:00:00+00:00",
        "checkedInAt": null
      }
      ''');

      final ticket = DigitalTicket.fromJson(Map<String, dynamic>.from(json));

      expect(ticket.ticketTypeName, 'Tribune');
      expect(ticket.quantity, 2);
      expect(ticket.token, 'abc123DEF456');
      // QR payload is the compact, PII-free wrapper around the opaque token.
      expect(ticket.qrPayload, 'JSO1.abc123DEF456');
      expect(ticket.isCheckedIn, isFalse);
    });
  });

  group('TicketOrder digital gating', () {
    TicketOrder orderWith(String status) => TicketOrder(
      id: 'o1',
      ticketTypeName: 'Tribune',
      quantity: 1,
      total: 25,
      currency: 'TND',
      status: status,
    );

    test('only Confirmed/CheckedIn expose a digital ticket', () {
      expect(orderWith('Pending').hasDigitalTicket, isFalse);
      expect(orderWith('Cancelled').hasDigitalTicket, isFalse);
      expect(orderWith('Confirmed').hasDigitalTicket, isTrue);
      expect(orderWith('CheckedIn').hasDigitalTicket, isTrue);
    });
  });

  group('AdminTicketsRepository.extractToken', () {
    test('strips the JSO1. prefix', () {
      expect(
        AdminTicketsRepository.extractToken('JSO1.tok-EN_123'),
        'tok-EN_123',
      );
    });

    test('extracts the last path segment of a ticket URL', () {
      expect(
        AdminTicketsRepository.extractToken('https://tickets.jso.tn/t/xyz789'),
        'xyz789',
      );
    });

    test('returns a bare manual code unchanged', () {
      expect(AdminTicketsRepository.extractToken('  rawcode  '), 'rawcode');
    });
  });

  group('fan digital ticket + staff scan flow', () {
    late List<http.Request> requests;

    ApiClient clientAnswering(Object? Function(http.Request) responder) {
      requests = <http.Request>[];
      return ApiClient(
        baseUrl: baseUrl,
        httpClient: MockClient((request) async {
          requests.add(request);
          return http.Response(
            jsonEncode(responder(request)),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
    }

    test(
      'getDigitalTicket sends bearer token and hits the digital endpoint',
      () async {
        final repo = TicketsRepository(
          clientAnswering(
            (_) => {
              'id': 'o1',
              'ticketTypeName': 'Virage',
              'quantity': 1,
              'currency': 'TND',
              'total': 15.0,
              'status': 'Confirmed',
              'token': 'opaque-token',
            },
          ),
        );

        final ticket = await repo.getDigitalTicket(
          token: 'FAN_JWT',
          ticketId: 'o1',
        );

        expect(requests.single.url.toString(), '$baseUrl/tickets/o1/digital');
        expect(requests.single.headers['Authorization'], 'Bearer FAN_JWT');
        expect(ticket.qrPayload, 'JSO1.opaque-token');
      },
    );

    test(
      'check-in returns a Valid result and sends the stripped token',
      () async {
        final repo = AdminTicketsRepository(
          clientAnswering(
            (_) => {
              'result': 'Valid',
              'message': 'Billet valide.',
              'ticket': {
                'id': 'o1',
                'ticketTypeName': 'Tribune',
                'quantity': 2,
                'status': 'CheckedIn',
              },
            },
          ),
        );

        final result = await repo.checkIn(
          adminToken: 'ADMIN_JWT',
          scannedValue: 'JSO1.the-token',
        );

        expect(
          requests.single.url.toString(),
          '$baseUrl/admin/tickets/check-in',
        );
        expect(requests.single.headers['Authorization'], 'Bearer ADMIN_JWT');
        final body = jsonDecode(requests.single.body) as Map<String, dynamic>;
        expect(body['token'], 'the-token');
        expect(result.isValid, isTrue);
        expect(result.ticket?.ticketTypeName, 'Tribune');
      },
    );

    test('second scan reports AlreadyUsed', () async {
      final repo = AdminTicketsRepository(
        clientAnswering(
          (_) => {
            'result': 'AlreadyUsed',
            'message': 'Billet déjà utilisé.',
            'ticket': {
              'id': 'o1',
              'ticketTypeName': 'Tribune',
              'quantity': 2,
              'status': 'CheckedIn',
            },
          },
        ),
      );

      final result = await repo.checkIn(
        adminToken: 'ADMIN_JWT',
        scannedValue: 'JSO1.the-token',
      );

      expect(result.isAlreadyUsed, isTrue);
      expect(result.isValid, isFalse);
    });

    test('validate parses a WrongMatch outcome', () {
      final result = TicketScanResult.fromJson(const {
        'result': 'WrongMatch',
        'message': 'Billet pour un autre match.',
      });
      expect(result.result, 'WrongMatch');
      expect(result.ticket, isNull);
    });
  });
}
