/// Typed exceptions raised by the JSO API layer.
///
/// Screens catch [ApiException] (the common base) to render an error state,
/// and can special-case [NotFoundException] when a resource is missing.
sealed class ApiException implements Exception {
  const ApiException(this.message);

  /// Human-readable description suitable for logging or an error view.
  final String message;

  @override
  String toString() => '$runtimeType: $message';
}

/// The server responded with a non-2xx status code (other than 404).
class ApiHttpException extends ApiException {
  const ApiHttpException(this.statusCode, super.message);

  final int statusCode;

  @override
  String toString() => 'ApiHttpException($statusCode): $message';
}

/// The requested resource returned HTTP 404.
class NotFoundException extends ApiException {
  const NotFoundException([super.message = 'Resource not found']);
}

/// A network-level failure (DNS, socket, connection refused, etc.).
class NetworkException extends ApiException {
  const NetworkException([super.message = 'Network error']);
}

/// The request exceeded the configured timeout.
class ApiTimeoutException extends ApiException {
  const ApiTimeoutException([super.message = 'Request timed out']);
}

/// The response body was not valid/expected JSON.
class ApiParseException extends ApiException {
  const ApiParseException([super.message = 'Failed to parse response']);
}
