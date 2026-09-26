import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';

void main() {
  const baseUrl = 'https://api.example.test/api';

  ApiClient clientReturning(http.Response Function(http.Request) handler) {
    return ApiClient(
      baseUrl: baseUrl,
      httpClient: MockClient((req) async {
        return handler(req);
      }),
    );
  }

  group('ApiClient.getJson', () {
    test('decodes a successful JSON object response', () async {
      late Uri requested;
      final client = clientReturning((req) {
        requested = req.url;
        return http.Response(
          '{"name":"JSO","city":"Oudhref"}',
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final result = await client.getJson('/home');

      expect(result, isA<Map<String, dynamic>>());
      expect((result as Map)['name'], 'JSO');
      expect(requested.toString(), '$baseUrl/home');
    });

    test('decodes a successful JSON array response', () async {
      final client = clientReturning(
        (req) => http.Response('[{"id":1},{"id":2}]', 200),
      );

      final result = await client.getJson('/matches');

      expect(result, isA<List<dynamic>>());
      expect((result as List).length, 2);
    });

    test('normalizes a path without a leading slash', () async {
      late Uri requested;
      final client = clientReturning((req) {
        requested = req.url;
        return http.Response('{}', 200);
      });

      await client.getJson('media');

      expect(requested.toString(), '$baseUrl/media');
    });

    test('appends query parameters', () async {
      late Uri requested;
      final client = clientReturning((req) {
        requested = req.url;
        return http.Response('{}', 200);
      });

      await client.getJson('/news', queryParameters: {'page': '2'});

      expect(requested.queryParameters['page'], '2');
    });

    test('sends Accept: application/json', () async {
      late Map<String, String> headers;
      final client = clientReturning((req) {
        headers = req.headers;
        return http.Response('{}', 200);
      });

      await client.getJson('/home');

      expect(headers['Accept'], 'application/json');
    });

    test('returns null for an empty 2xx body', () async {
      final client = clientReturning((req) => http.Response('', 204));

      final result = await client.getJson('/home');

      expect(result, isNull);
    });

    test('maps 404 to NotFoundException', () async {
      final client = clientReturning((req) => http.Response('not found', 404));

      expect(
        () => client.getJson('/matches/missing'),
        throwsA(isA<NotFoundException>()),
      );
    });

    test('maps other non-2xx to ApiHttpException with status code', () async {
      final client = clientReturning((req) => http.Response('boom', 500));

      await expectLater(
        client.getJson('/home'),
        throwsA(
          isA<ApiHttpException>().having(
            (e) => e.statusCode,
            'statusCode',
            500,
          ),
        ),
      );
    });

    test('maps a timeout to ApiTimeoutException', () async {
      final client = ApiClient(
        baseUrl: baseUrl,
        timeout: const Duration(milliseconds: 20),
        httpClient: MockClient((req) async {
          await Future<void>.delayed(const Duration(seconds: 1));
          return http.Response('{}', 200);
        }),
      );

      expect(
        () => client.getJson('/home'),
        throwsA(isA<ApiTimeoutException>()),
      );
    });

    test('maps a socket error to NetworkException', () async {
      final client = ApiClient(
        baseUrl: baseUrl,
        httpClient: MockClient((req) async {
          throw const SocketException('connection refused');
        }),
      );

      expect(() => client.getJson('/home'), throwsA(isA<NetworkException>()));
    });

    test('maps a client error to NetworkException', () async {
      final client = ApiClient(
        baseUrl: baseUrl,
        httpClient: MockClient((req) async {
          throw http.ClientException('socket closed');
        }),
      );

      expect(() => client.getJson('/home'), throwsA(isA<NetworkException>()));
    });

    test('maps invalid JSON to ApiParseException', () async {
      final client = clientReturning(
        (req) => http.Response('{not valid json', 200),
      );

      expect(() => client.getJson('/home'), throwsA(isA<ApiParseException>()));
    });
  });
}
