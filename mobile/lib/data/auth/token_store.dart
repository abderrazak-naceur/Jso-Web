import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the fan JWT across app launches.
///
/// The interface is intentionally tiny so tests can supply an in-memory fake.
/// Implementations must never log the token.
abstract interface class TokenStore {
  /// Returns the saved token, or null when none is stored.
  Future<String?> read();

  /// Persists [token], replacing any previously stored value.
  Future<void> write(String token);

  /// Removes the stored token (used on logout / expired session).
  Future<void> clear();
}

/// [TokenStore] backed by `flutter_secure_storage`, which uses the Android
/// keystore / iOS Keychain so the JWT is never persisted in clear text.
class SecureTokenStore implements TokenStore {
  SecureTokenStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  /// Single storage key for the fan token.
  static const String _key = 'jso_fan_token';

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);

  @override
  Future<void> clear() => _storage.delete(key: _key);
}
