import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/config/site_config.dart';

void main() {
  test('admin console uses the configured website', () {
    expect(SiteConfig.origin, isNotNull);
    expect(SiteConfig.adminUrl, SiteConfig.origin!.resolve('/admin'));
  });

  test('admin session bridge only trusts the exact website origin', () {
    final origin = Uri.parse('https://jso-web.onrender.com');
    expect(
      SiteConfig.sameOrigin(
        Uri.parse('https://jso-web.onrender.com/admin/donations'),
        origin,
      ),
      isTrue,
    );
    expect(
      SiteConfig.sameOrigin(
        Uri.parse('https://jso-web.onrender.com.evil.test/admin'),
        origin,
      ),
      isFalse,
    );
    expect(
      SiteConfig.sameOrigin(
        Uri.parse('http://jso-web.onrender.com/admin'),
        origin,
      ),
      isFalse,
    );
    expect(
      SiteConfig.sameOrigin(
        Uri.parse('https://jso-web.onrender.com:444/admin'),
        origin,
      ),
      isFalse,
    );
    expect(
      SiteConfig.sameOrigin(
        Uri.parse('https://user@jso-web.onrender.com/admin'),
        origin,
      ),
      isFalse,
    );
  });
}
