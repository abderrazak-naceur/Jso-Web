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
  Future<dynamic> getJson(
    String path, {
    Map<String, String>? queryParameters,
  }) async {
    final uri = _buildUri(path, queryParameters);

    http.Response response;
    try {
      response = await _http
          .get(uri, headers: const {'Accept': 'application/json'})
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
