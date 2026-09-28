import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/auth/token_store.dart';
import 'package:jso_mobile/data/models/fan_user.dart';
import 'package:jso_mobile/data/repositories/admin_auth_repository.dart';
import 'package:jso_mobile/data/repositories/auth_repository.dart';
import 'package:jso_mobile/features/auth/admin_auth_controller.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';

/// In-memory [TokenStore] for widget tests.
///
/// The production [SecureTokenStore] talks to `flutter_secure_storage`, which
/// uses a platform channel that is unavailable in the widget-test binding. This
/// fake keeps the token in a field so tests can seed a session and assert that
/// logout empties it.
class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore([this.token]);

  String? token;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String token) async => this.token = token;

  @override
  Future<void> clear() async => token = null;
}

/// A stubbable [AuthRepository] that never touches the network.
///
/// Each endpoint resolves from an injected result/user or throws an injected
/// [ApiException], so tests can drive success and failure flows deterministically.
class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository({
    this.loginResult,
    this.registerResult,
    this.meUser,
    this.loginError,
    this.registerError,
    this.meError,
  }) : super(ApiClient());

  final AuthResult? loginResult;
  final AuthResult? registerResult;
  final FanUser? meUser;
  final ApiException? loginError;
  final ApiException? registerError;
  final ApiException? meError;

  @override
  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    if (loginError != null) {
      throw loginError!;
    }
    return loginResult!;
  }

  @override
  Future<AuthResult> register({
    required String email,
    required String displayName,
    required String password,
  }) async {
    if (registerError != null) {
      throw registerError!;
    }
    return registerResult!;
  }

  @override
  Future<FanUser> getMe(String token) async {
    if (meError != null) {
      throw meError!;
    }
    return meUser!;
  }

  /// Records for the profile/GDPR flows and injectable outcomes.
  final List<Map<String, Object?>> profileUpdates = [];
  final List<Map<String, String>> passwordChanges = [];
  int deleteCalls = 0;
  FanUser? updateResult;
  ApiException? updateError;
  ApiException? changePasswordError;
  Map<String, dynamic> exportData = const {};
  ApiException? exportError;
  ApiException? deleteError;

  @override
  Future<FanUser> updateProfile(
    String token, {
    String? displayName,
    DateTime? birthDate,
    bool? anniversaryOptIn,
  }) async {
    profileUpdates.add({
      'displayName': displayName,
      'birthDate': birthDate,
      'anniversaryOptIn': anniversaryOptIn,
    });
    if (updateError != null) throw updateError!;
    return updateResult ??
        SampleFan.user(
          displayName: displayName ?? 'Sami Ultras',
          anniversaryOptIn: anniversaryOptIn ?? false,
        );
  }

  @override
  Future<void> changePassword(
    String token, {
    required String currentPassword,
    required String newPassword,
  }) async {
    passwordChanges.add({'current': currentPassword, 'next': newPassword});
    if (changePasswordError != null) throw changePasswordError!;
  }

  @override
  Future<Map<String, dynamic>> exportMyData(String token) async {
    if (exportError != null) throw exportError!;
    return exportData;
  }

  @override
  Future<void> deleteMyAccount(String token) async {
    deleteCalls++;
    if (deleteError != null) throw deleteError!;
  }
}

/// Convenience factory for an [AuthController] backed by fakes.
AuthController fakeAuthController({
  FakeAuthRepository? repository,
  InMemoryTokenStore? tokenStore,
}) {
  return AuthController(
    repository: repository ?? FakeAuthRepository(),
    tokenStore: tokenStore ?? InMemoryTokenStore(),
  );
}

/// Convenience factory for an [AdminAuthController] backed by fakes. It never
/// touches the network: the repository is only exercised on an explicit admin
/// login, which the widget tests do not trigger. Admin sessions start
/// anonymous, so no token is seeded.
AdminAuthController fakeAdminAuthController({InMemoryTokenStore? tokenStore}) {
  return AdminAuthController(
    repository: AdminAuthRepository(ApiClient()),
    tokenStore: tokenStore ?? InMemoryTokenStore(),
  );
}

/// Sample fan payloads for the auth tests.
class SampleFan {
  const SampleFan._();

  static FanUser user({
    String id = 'fan-1',
    String email = 'supporter@jso.tn',
    String displayName = 'Sami Ultras',
    bool emailVerified = true,
    bool anniversaryOptIn = false,
    DateTime? birthDate,
  }) => FanUser(
    id: id,
    email: email,
    displayName: displayName,
    emailVerified: emailVerified,
    anniversaryOptIn: anniversaryOptIn,
    birthDate: birthDate,
  );

  static AuthResult authResult({String token = 'jwt-token', FanUser? user}) =>
      AuthResult(accessToken: token, user: user ?? SampleFan.user());
}
