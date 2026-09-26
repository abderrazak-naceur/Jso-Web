import 'package:flutter/material.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'data/repositories/public_api_repository.dart';

// TODO(future): Firebase / FCM push notifications and Crashlytics are planned
// for a later iteration (see docs/ROADMAP.md). No Firebase code is wired here.

void main() {
  final apiClient = ApiClient();
  final repository = PublicApiRepository(apiClient);
  runApp(JsoApp(repository: repository));
}
