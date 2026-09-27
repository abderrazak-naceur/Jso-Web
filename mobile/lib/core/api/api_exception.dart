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
  const ApiHttpException(this.statusCode, super.message, {this.serverMessage});

  final int statusCode;

  /// The backend's `{ "message": ... }` from the error body, when present.
  ///
  /// The JSO API returns this on validation failures (400) and conflicts
  /// (409); `describeApiError` in `error_text.dart` turns it into French UI
  /// copy.
  final String? serverMessage;

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

/// Authentication failed (HTTP 401): wrong email/password or expired token.
class InvalidCredentialsException extends ApiException {
  const InvalidCredentialsException([super.message = 'Invalid credentials.']);
}

/// Registration conflicted with an existing account (HTTP 409).
class EmailAlreadyExistsException extends ApiException {
  const EmailAlreadyExistsException([super.message = 'Email already in use.']);
}

/// A request failed validation (HTTP 400) — carries the backend `{message}`
/// so the UI can surface the server-provided text (e.g. password too short).
class ValidationException extends ApiException {
  const ValidationException([super.message = 'Validation failed.']);
}
