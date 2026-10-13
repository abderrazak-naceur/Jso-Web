// Public constructor parameters intentionally initialize private fields.
// ignore_for_file: prefer_initializing_formals

import 'package:flutter/foundation.dart';

import '../../core/api/api_exception.dart';
import '../../data/auth/token_store.dart';
import '../../data/models/admin_account.dart';
import '../../data/repositories/admin_auth_repository.dart';

/// Lifecycle of the admin session (mirrors [AuthStatus] for the fan side).
enum AdminAuthStatus { unknown, authenticated, anonymous }

/// Holds the administrator session for the widget tree (via Provider).
///
/// Kept entirely separate from the fan [AuthController]: it talks to
/// [AdminAuthRepository] (`POST /api/auth/login`) and persists the admin JWT
/// under [SecureTokenStore.adminKey], so the two tokens never collide. The
/// token stays in memory (never logged) for authenticated admin calls.
class AdminAuthController extends ChangeNotifier {
  AdminAuthController({
    required AdminAuthRepository repository,
    required TokenStore tokenStore,
  }) : _repository = repository,
       _tokenStore = tokenStore;

  final AdminAuthRepository _repository;
  final TokenStore _tokenStore;

  AdminAuthStatus _status = AdminAuthStatus.unknown;
  AdminAccount? _user;
  String? _accessToken;
  bool _busy = false;
  String? _errorMessage;

  AdminAuthStatus get status => _status;
  AdminAccount? get user => _user;
  bool get isBusy => _busy;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AdminAuthStatus.authenticated;

  /// The current admin JWT when authenticated, else null.
  String? get accessToken =>
      _status == AdminAuthStatus.authenticated ? _accessToken : null;

  /// Restores a persisted admin session only after the API confirms the token
  /// and the account is still active with the same role.
  Future<void> restoreSession() async {
    final token = await _tokenStore.read();
    if (token == null || token.isEmpty) {
      _setAnonymous();
      return;
    }
    try {
      final user = await _repository.me(token);
      _accessToken = token;
      _user = user;
      _status = AdminAuthStatus.authenticated;
      _errorMessage = null;
      notifyListeners();
    } on ApiHttpException catch (e) {
      if (e.statusCode == 401 || e.statusCode == 403) await _tokenStore.clear();
      _setAnonymous();
    } on ApiException {
      // Keep the encrypted token so a temporary network failure does not
      // destroy the session; the next app start can validate it again.
      _setAnonymous();
    }
  }

  /// Logs in via `POST /api/auth/login` and persists the token. Returns true
  /// on success; on failure sets [errorMessage] and returns false.
  Future<bool> login(String email, String password) async {
    _busy = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final result = await _repository.login(email: email, password: password);
      await _tokenStore.write(result.accessToken);
      _accessToken = result.accessToken;
      _user = result.user;
      _status = AdminAuthStatus.authenticated;
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      return false;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  /// Clears the stored token and resets to the anonymous state.
  Future<void> logout() async {
    await _tokenStore.clear();
    _user = null;
    _accessToken = null;
    _status = AdminAuthStatus.anonymous;
    _errorMessage = null;
    notifyListeners();
  }

  void _setAnonymous() {
    _user = null;
    _accessToken = null;
    _status = AdminAuthStatus.anonymous;
    notifyListeners();
  }
}
