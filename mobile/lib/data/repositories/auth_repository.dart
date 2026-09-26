import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/fan_user.dart';
import '../models/json_utils.dart';

/// Outcome of a successful register/login: the JWT plus the fan profile.
class AuthResult {
  const AuthResult({required this.accessToken, required this.user});

  final String accessToken;
  final FanUser user;
}

/// Repository over the fan account endpoints in
/// `backend/src/JSO.Api/Controllers/AccountController.cs`.
///
/// Unlike [PublicApiRepository], these calls carry credentials: register/login
/// exchange them for a JWT, and [getMe] sends that JWT as a Bearer token.
/// Non-2xx responses are mapped to typed [ApiException]s so callers can render
/// French error messages.
class AuthRepository {
  AuthRepository(this._client);

  final ApiClient _client;

  /// `POST /api/account/register` — creates the account and returns the JWT.
  Future<AuthResult> register({
    required String email,
    required String displayName,
    required String password,
  }) => _post('/account/register', {
    'email': email,
    'displayName': displayName,
    'password': password,
  });

  /// `POST /api/account/login` — exchanges credentials for a JWT.
  Future<AuthResult> login({required String email, required String password}) =>
      _post('/account/login', {'email': email, 'password': password});

  /// `GET /api/account/me` — resolves the current fan from a Bearer [token].
  Future<FanUser> getMe(String token) async {
    final json = await _mapAuthErrors(
      () => _client.getJson('/account/me', bearerToken: token),
    );
    return FanUser.fromJson(_asMap(json));
  }

  Future<AuthResult> _post(String path, Map<String, Object?> body) async {
    final json = await _mapAuthErrors(() => _client.postJson(path, body: body));
    final map = _asMap(json);
    return AuthResult(
      accessToken: asString(map['accessToken']),
      user: FanUser.fromJson(_asMap(map['user'])),
    );
  }

  /// Runs [request], translating [ApiHttpException] status codes into the
  /// auth-specific exceptions the UI understands.
  Future<dynamic> _mapAuthErrors(Future<dynamic> Function() request) async {
    try {
      return await request();
    } on ApiHttpException catch (e) {
      switch (e.statusCode) {
        case 401:
          throw const InvalidCredentialsException();
        case 409:
          throw const EmailAlreadyExistsException();
        case 400:
          // The backend returns `{message}` on validation errors, but
          // [ApiClient] only surfaces the status code, so use the default
          // French text the UI already knows how to show.
          throw const ValidationException();
        default:
          rethrow;
      }
    }
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
}
