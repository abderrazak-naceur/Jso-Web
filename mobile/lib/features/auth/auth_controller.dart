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
}
