/// Configuration for the JSO public REST API base URL.
///
/// Mirrors the frontend pattern in `frontend/src/lib/apiConfig.js`:
/// the base URL is configurable at build time and any trailing slash is
/// stripped so paths can be joined consistently.
///
/// On the web the production frontend uses a same-origin `/api` base behind
/// Nginx. For the mobile app the equivalent is provided at build time via:
///
/// ```sh
/// flutter run --dart-define=JSO_API_BASE_URL=https://jso.example.tn/api
/// flutter build apk --dart-define=JSO_API_BASE_URL=https://jso.example.tn/api
/// ```
///
/// The development default (`http://10.0.2.2:5000/api`) targets the Android
/// emulator loopback alias for the host machine, where the .NET API listens
/// on port 5000. iOS simulators can reach the host via `http://localhost:5000/api`.
class ApiConfig {
  const ApiConfig._();

  /// Dev default: Android emulator loopback to the host running the .NET API.
  static const String _devDefault = 'http://10.0.2.2:5000/api';

  /// Build-time override supplied through `--dart-define=JSO_API_BASE_URL=...`.
  static const String _rawBaseUrl = String.fromEnvironment(
    'JSO_API_BASE_URL',
    defaultValue: _devDefault,
  );

  /// The effective API base URL with any trailing slash removed.
  static String get baseUrl => _stripTrailingSlash(_rawBaseUrl);

  static String _stripTrailingSlash(String value) {
    var result = value.trim();
    while (result.endsWith('/')) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }
}
