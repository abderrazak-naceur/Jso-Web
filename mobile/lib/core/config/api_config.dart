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

  /// Resolves a media/document URL returned by the API into one the device
  /// can load.
  ///
  /// The backend stores admin uploads as root-relative paths (e.g.
  /// `/uploads/media/2026/03/photo.jpg`, served by the API host), which the web
  /// resolves against its own origin. The app has no origin, so relative paths
  /// are joined to the scheme + authority of [baseUrl] (for
  /// `http://10.0.2.2:5000/api` → `http://10.0.2.2:5000/uploads/...`).
  ///
  /// Absolute `http(s)` URLs are returned unchanged. Returns null for a
  /// null/blank value. When the base URL itself is relative (no host), the
  /// value is returned as-is because there is nothing to resolve against.
  static String? resolveUrl(String? url, {String? base}) {
    final value = url?.trim() ?? '';
    if (value.isEmpty) return null;
    final parsed = Uri.tryParse(value);
    if (parsed == null) return null;
    if (parsed.hasScheme) return value;

    final api = Uri.tryParse(base ?? baseUrl);
    if (api == null || !api.hasScheme || api.host.isEmpty) return value;
    if (value.startsWith('//')) return '${api.scheme}:$value';
    final origin = '${api.scheme}://${api.authority}';
    return value.startsWith('/') ? '$origin$value' : '$origin/$value';
  }

  static String _stripTrailingSlash(String value) {
    var result = value.trim();
    while (result.endsWith('/')) {
      result = result.substring(0, result.length - 1);
    }
    return result;
  }
}
