import '../../core/api/api_client.dart';
import '../../core/api/api_exception.dart';
import '../models/admin_account.dart';
import '../models/json_utils.dart';

/// Outcome of a successful admin login: the JWT plus the admin profile.
class AdminAuthResult {
  const AdminAuthResult({required this.accessToken, required this.user});

  final String accessToken;
  final AdminAccount user;
}

/// Repository over the admin auth endpoint in
/// `backend/src/JSO.Api/Controllers/AuthController.cs`.
///
/// `POST /api/auth/login` exchanges admin credentials for a JWT that carries
/// the admin [AdminAccount.role]. Fan tokens (issued by `/account/login`) only
/// ever carry the "Fan" role and can never satisfy an admin policy, so the two
/// flows are kept fully separate.
class AdminAuthRepository {
  AdminAuthRepository(this._client);

  final ApiClient _client;

  /// `POST /api/auth/login` — validates credentials and returns the JWT.
  ///
  /// Maps a 401 to [InvalidCredentialsException]; other non-2xx surface the
  /// backend `{message}` via the underlying [ApiHttpException].
  Future<AdminAuthResult> login({
    required String email,
    required String password,
  }) async {
    try {
      final json = await _client.postJson(
        '/auth/login',
        body: {'email': email, 'password': password},
      );
      final map = _asMap(json);
      return AdminAuthResult(
        accessToken: asString(map['accessToken']),
        user: AdminAccount.fromJson(_asMap(map['user'])),
      );
    } on ApiHttpException catch (e) {
      if (e.statusCode == 401) {
        throw const InvalidCredentialsException();
      }
      rethrow;
    }
  }

  Map<String, dynamic> _asMap(Object? json) =>
      json is Map ? Map<String, dynamic>.from(json) : <String, dynamic>{};
}
