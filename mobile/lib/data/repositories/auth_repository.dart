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

  /// `PUT /api/account/me` — updates the signed-in fan's profile (idea A3).
  ///
  /// Every field is optional so partial updates are supported. [birthDate] is
  /// personal data retained only while [anniversaryOptIn] is on; sending the
  /// opt-in off clears the stored date server-side. Returns the refreshed
  /// [FanUser]. A 400 surfaces the backend message via [ApiHttpException].
  Future<FanUser> updateProfile(
    String token, {
    String? displayName,
    DateTime? birthDate,
    bool? anniversaryOptIn,
  }) async {
    final body = <String, Object?>{};
    if (displayName != null) body['displayName'] = displayName;
    if (birthDate != null) body['birthDate'] = _dateOnly(birthDate);
    if (anniversaryOptIn != null) body['anniversaryOptIn'] = anniversaryOptIn;
    final json = await _client.putJson(
      '/account/me',
      body: body,
      bearerToken: token,
    );
    return FanUser.fromJson(_asMap(json));
  }

  /// `POST /api/account/change-password` — changes the fan's password.
  ///
  /// Throws [InvalidCredentialsException] on a wrong current password and
  /// surfaces the backend `{message}` (e.g. min length) on other 400s.
  Future<void> changePassword(
    String token, {
    required String currentPassword,
    required String newPassword,
  }) async {
    await _client.postJson(
      '/account/change-password',
      body: {'currentPassword': currentPassword, 'newPassword': newPassword},
      bearerToken: token,
    );
  }

  /// `GET /api/fan/data-export` — the fan's personal-data export (RGPD, idea
  /// E17). Returned as a raw JSON map so the UI can present a summary.
  Future<Map<String, dynamic>> exportMyData(String token) async {
    final json = await _client.getJson('/fan/data-export', bearerToken: token);
    return _asMap(json);
  }

  /// `POST /api/fan/account-deletion` — anonymises and deactivates the fan's
  /// own account (RGPD right to erasure). Idempotent server-side.
  Future<void> deleteMyAccount(String token) async {
    await _client.postJson('/fan/account-deletion', bearerToken: token);
  }

  /// Formats a [DateTime] as the `yyyy-MM-dd` the API's `DateOnly` expects.
  static String _dateOnly(DateTime d) {
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
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
