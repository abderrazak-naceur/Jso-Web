/// Public website used by the embedded administrator console.
///
/// Point this at the website paired with the configured API when building:
/// `--dart-define=JSO_WEB_BASE_URL=https://jso-web.onrender.com`.
class SiteConfig {
  const SiteConfig._();

  static const String _rawBaseUrl = String.fromEnvironment(
    'JSO_WEB_BASE_URL',
    defaultValue: 'https://jso-web.onrender.com',
  );

  static Uri? get origin {
    final uri = Uri.tryParse(_rawBaseUrl.trim());
    if (uri == null ||
        !uri.hasAuthority ||
        !const {'https', 'http'}.contains(uri.scheme) ||
        uri.userInfo.isNotEmpty ||
        uri.query.isNotEmpty ||
        uri.fragment.isNotEmpty) {
      return null;
    }
    return Uri(
      scheme: uri.scheme,
      host: uri.host,
      port: uri.hasPort ? uri.port : null,
    );
  }

  static Uri? get adminUrl => origin?.resolve('/admin');

  static Uri? adminSectionUrl(String section) {
    if (!RegExp(r'^[a-z][a-z0-9-]*$').hasMatch(section)) return null;
    return origin?.resolve('/admin/$section');
  }

  static bool sameOrigin(Uri target, Uri origin) =>
      target.scheme == origin.scheme &&
      target.host == origin.host &&
      target.port == origin.port &&
      target.userInfo.isEmpty;
}
