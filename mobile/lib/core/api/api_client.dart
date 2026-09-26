import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'api_exception.dart';

/// A thin HTTP client over the JSO public REST API.
///
/// Responsibilities:
/// - joins [ApiConfig.baseUrl] with a request path,
/// - applies a request [timeout],
/// - sets `Accept: application/json`,
/// - decodes JSON responses,
/// - maps failures to the typed exceptions in `api_exception.dart`.
///
/// The public endpoints require no authentication, so no auth header is sent.
class ApiClient {
  ApiClient({
    http.Client? httpClient,
    String? baseUrl,
    this.timeout = const Duration(seconds: 15),
  }) : _http = httpClient ?? http.Client(),
       _baseUrl = baseUrl ?? ApiConfig.baseUrl;

  final http.Client _http;
  final String _baseUrl;
  final Duration timeout;

  /// GETs [path] (e.g. `/home`) and decodes the JSON body.
  ///
  /// Returns the decoded value, which is a `Map<String, dynamic>` or a
  /// `List<dynamic>` depending on the endpoint. Throws a subclass of
  /// [ApiException] on failure.
  ///
  /// Pass [bearerToken] to authenticate the request (e.g. `/account/me`); when
  /// null (the default) no `Authorization` header is sent, so existing public
  /// calls remain anonymous exactly as before.
  Future<dynamic> getJson(
    String path, {
    Map<String, String>? queryParameters,
    String? bearerToken,
  }) async {
    final uri = _buildUri(path, queryParameters);

    http.Response response;
    try {
      response = await _http
          .get(uri, headers: _headers(bearerToken: bearerToken))
          .timeout(timeout);
    } on TimeoutException {
      throw const ApiTimeoutException();
    } on SocketException catch (e) {
      throw NetworkException('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw NetworkException('Network error: ${e.message}');
    }

    return _handleResponse(response);
  }

  /// POSTs a JSON-encoded [body] to [path] and decodes the JSON response.
  ///
  /// Sends `Content-Type` + `Accept: application/json`, applies the same
  /// [timeout], and optionally adds `Authorization: Bearer <bearerToken>` when
  /// [bearerToken] is non-null. Extra [headers] are merged (and can override
  /// the defaults). Reuses the same [ApiException] mapping as [getJson].
  Future<dynamic> postJson(
    String path, {
    Object? body,
    Map<String, String>? headers,
    String? bearerToken,
  }) async {
    final uri = _buildUri(path, null);
    final requestHeaders = <String, String>{
      'Content-Type': 'application/json',
      ..._headers(bearerToken: bearerToken),
      ...?headers,
    };

    http.Response response;
    try {
      response = await _http
          .post(
            uri,
            headers: requestHeaders,
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(timeout);
    } on TimeoutException {
      throw const ApiTimeoutException();
    } on SocketException catch (e) {
      throw NetworkException('Network error: ${e.message}');
    } on http.ClientException catch (e) {
      throw NetworkException('Network error: ${e.message}');
    }

    return _handleResponse(response);
  }

  Map<String, String> _headers({String? bearerToken}) => {
    'Accept': 'application/json',
    if (bearerToken != null) 'Authorization': 'Bearer $bearerToken',
  };

  dynamic _handleResponse(http.Response response) {
    final status = response.statusCode;

    if (status == 404) {
      throw const NotFoundException();
    }
    if (status < 200 || status >= 300) {
      throw ApiHttpException(status, 'Unexpected status code $status');
    }

    if (response.body.isEmpty) {
      return null;
    }

    try {
      return jsonDecode(response.body);
    } on FormatException catch (e) {
      throw ApiParseException('Invalid JSON: ${e.message}');
    }
  }

  Uri _buildUri(String path, Map<String, String>? queryParameters) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final base = Uri.parse('$_baseUrl$normalizedPath');
    if (queryParameters == null || queryParameters.isEmpty) {
      return base;
    }
    return base.replace(
      queryParameters: {...base.queryParameters, ...queryParameters},
    );
  }

  /// Releases the underlying HTTP client.
  void dispose() => _http.close();
}
