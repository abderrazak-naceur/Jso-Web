import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/auth/token_store.dart';
import 'package:jso_mobile/data/models/fan_user.dart';
import 'package:jso_mobile/data/repositories/auth_repository.dart';
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

/// Sample fan payloads for the auth tests.
class SampleFan {
  const SampleFan._();

  static FanUser user({
    String id = 'fan-1',
    String email = 'supporter@jso.tn',
    String displayName = 'Sami Ultras',
    bool emailVerified = true,
  }) => FanUser(
    id: id,
    email: email,
    displayName: displayName,
    emailVerified: emailVerified,
  );

  static AuthResult authResult({String token = 'jwt-token', FanUser? user}) =>
      AuthResult(accessToken: token, user: user ?? SampleFan.user());
}
