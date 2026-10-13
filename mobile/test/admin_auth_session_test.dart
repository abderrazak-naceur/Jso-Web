import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/data/models/admin_account.dart';
import 'package:jso_mobile/data/repositories/admin_auth_repository.dart';
import 'package:jso_mobile/features/auth/admin_auth_controller.dart';

import 'support/fake_auth.dart';

class _StubAdminAuthRepository extends AdminAuthRepository {
  _StubAdminAuthRepository({this.account, this.error}) : super(ApiClient());

  final AdminAccount? account;
  final ApiException? error;

  @override
  Future<AdminAccount> me(String token) async {
    if (error != null) throw error!;
    return account!;
  }
}

void main() {
  group('AdminAuthController.restoreSession', () {
    test(
      'restores the encrypted token and active profile after API validation',
      () async {
        final store = InMemoryTokenStore('saved-admin-token');
        final user = AdminAccount(
          id: 'admin-1',
          email: 'manager@jso.tn',
          displayName: 'Club manager',
          role: 'ClubAdmin',
        );
        final controller = AdminAuthController(
          repository: _StubAdminAuthRepository(account: user),
          tokenStore: store,
        );

        await controller.restoreSession();

        expect(controller.status, AdminAuthStatus.authenticated);
        expect(controller.accessToken, 'saved-admin-token');
        expect(controller.user?.email, user.email);
        expect(store.token, 'saved-admin-token');
      },
    );

    test(
      'clears a rejected token but retains it on a temporary network error',
      () async {
        final rejectedStore = InMemoryTokenStore('expired-token');
        final rejected = AdminAuthController(
          repository: _StubAdminAuthRepository(
            error: const ApiHttpException(401, 'Unauthorized'),
          ),
          tokenStore: rejectedStore,
        );
        await rejected.restoreSession();
        expect(rejected.status, AdminAuthStatus.anonymous);
        expect(rejectedStore.token, isNull);

        final offlineStore = InMemoryTokenStore('offline-token');
        final offline = AdminAuthController(
          repository: _StubAdminAuthRepository(error: const NetworkException()),
          tokenStore: offlineStore,
        );
        await offline.restoreSession();
        expect(offline.status, AdminAuthStatus.anonymous);
        expect(offlineStore.token, 'offline-token');
      },
    );
  });
}
