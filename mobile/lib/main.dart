import 'package:flutter/material.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'data/auth/token_store.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/public_api_repository.dart';
import 'data/repositories/tickets_repository.dart';
import 'features/auth/auth_controller.dart';

// TODO(future): Firebase / FCM push notifications and Crashlytics are planned
// for a later iteration (see docs/ROADMAP.md). No Firebase code is wired here.

void main() {
  final apiClient = ApiClient();
  final repository = PublicApiRepository(apiClient);
  final ticketsRepository = TicketsRepository(apiClient);
  final authController = AuthController(
    repository: AuthRepository(apiClient),
    tokenStore: SecureTokenStore(),
  );
  // Restore any persisted fan session; falls back to anonymous on failure.
  authController.restoreSession();
  runApp(
    JsoApp(
      repository: repository,
      ticketsRepository: ticketsRepository,
      authController: authController,
    ),
  );
}
