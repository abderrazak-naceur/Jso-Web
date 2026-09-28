import 'package:flutter/foundation.dart';

import '../../core/api/api_exception.dart';
import '../../data/auth/token_store.dart';
import '../../data/models/fan_user.dart';
import '../../data/repositories/auth_repository.dart';

/// Lifecycle of the fan session.
///
/// [unknown] is the startup state before [AuthController.restoreSession] has
/// resolved, letting the UI show a splash rather than flashing the login form.
enum AuthStatus { unknown, authenticated, anonymous }

/// Holds the fan authentication state for the widget tree (via Provider).
///
/// Persists the JWT through [TokenStore] and talks to [AuthRepository] for
/// register/login/me. The token itself is never exposed or logged.
class AuthController extends ChangeNotifier {
  AuthController({required this._repository, required this._tokenStore});

  final AuthRepository _repository;
  final TokenStore _tokenStore;

  AuthStatus _status = AuthStatus.unknown;
  FanUser? _user;
  String? _accessToken;
  bool _busy = false;
  String? _errorMessage;

  AuthStatus get status => _status;
  FanUser? get user => _user;

  /// The current fan JWT when authenticated, else null. Kept in memory only
  /// (never logged) so authenticated repositories (e.g. ticketing) can attach
  /// it as a Bearer token without re-reading secure storage.
  String? get accessToken =>
      _status == AuthStatus.authenticated ? _accessToken : null;
  bool get isBusy => _busy;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  /// Resolves the initial session: if a token is stored, validate it via
  /// `/me`; on any failure clear the token and fall back to anonymous.
  Future<void> restoreSession() async {
    final token = await _tokenStore.read();
    if (token == null || token.isEmpty) {
      _setAnonymous();
      return;
    }
    try {
      _user = await _repository.getMe(token);
      _accessToken = token;
      _status = AuthStatus.authenticated;
      notifyListeners();
    } on ApiException {
      await _tokenStore.clear();
      _setAnonymous();
    }
  }

  /// Logs in and persists the token. Returns true on success; on failure sets
  /// [errorMessage] and returns false.
  Future<bool> login(String email, String password) {
    return _run(() => _repository.login(email: email, password: password));
  }

  /// Registers a new account and persists the token. Returns true on success;
  /// on failure sets [errorMessage] and returns false.
  Future<bool> register(String email, String displayName, String password) {
    return _run(
      () => _repository.register(
        email: email,
        displayName: displayName,
        password: password,
      ),
    );
  }

  /// Applies an updated [FanUser] (e.g. after a profile edit) and notifies
  /// listeners so the profile screen reflects it immediately.
  void applyUser(FanUser user) {
    _user = user;
    notifyListeners();
  }

  /// Clears the stored token and resets to the anonymous state.
  Future<void> logout() async {
    await _tokenStore.clear();
    _user = null;
    _accessToken = null;
    _status = AuthStatus.anonymous;
    _errorMessage = null;
    notifyListeners();
  }

  Future<bool> _run(Future<AuthResult> Function() action) async {
    _busy = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final result = await action();
      await _tokenStore.write(result.accessToken);
      _accessToken = result.accessToken;
      _user = result.user;
      _status = AuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  void _setAnonymous() {
    _user = null;
    _accessToken = null;
    _status = AuthStatus.anonymous;
    notifyListeners();
  }

  /// Updates the profile via `PUT /account/me` using the in-memory token and
  /// applies the refreshed [FanUser]. Throws [ApiException] on failure so the
  /// screen can show the translated message; returns the updated user.
  Future<FanUser> updateProfile({
    String? displayName,
    DateTime? birthDate,
    bool? anniversaryOptIn,
  }) async {
    final token = _accessToken;
    if (token == null) throw const InvalidCredentialsException();
    final updated = await _repository.updateProfile(
      token,
      displayName: displayName,
      birthDate: birthDate,
      anniversaryOptIn: anniversaryOptIn,
    );
    applyUser(updated);
    return updated;
  }

  /// Changes the password via `POST /account/change-password`. Throws
  /// [ApiException] on failure.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final token = _accessToken;
    if (token == null) throw const InvalidCredentialsException();
    await _repository.changePassword(
      token,
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }

  /// Fetches the RGPD personal-data export (`GET /fan/data-export`).
  Future<Map<String, dynamic>> exportMyData() async {
    final token = _accessToken;
    if (token == null) throw const InvalidCredentialsException();
    return _repository.exportMyData(token);
  }

  /// Requests account erasure (`POST /fan/account-deletion`) then signs out.
  Future<void> deleteAccount() async {
    final token = _accessToken;
    if (token == null) throw const InvalidCredentialsException();
    await _repository.deleteMyAccount(token);
    await logout();
  }
}
