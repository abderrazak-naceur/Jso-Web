import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/data/models/payment_history_item.dart';
import 'package:jso_mobile/data/repositories/payment_history_repository.dart';
import 'package:jso_mobile/features/account/account_dashboard_screen.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';

import 'support/fake_auth.dart';

class _TicketHistoryRepository extends PaymentHistoryRepository {
  _TicketHistoryRepository() : super(ApiClient());

  @override
  Future<List<PaymentHistoryItem>> mine(String token) async => const [
    PaymentHistoryItem(
      id: 'ticket-1',
      type: 'ticket',
      description: 'Billet · Tribune principale',
      status: 'Confirmed',
      amount: 8.5,
      currency: 'TND',
      provider: 'Flouci',
    ),
  ];
}

void main() {
  testWidgets('account dashboard displays ticket payment history', (
    tester,
  ) async {
    final auth = fakeAuthController(
      repository: FakeAuthRepository(
        loginResult: SampleFan.authResult(token: 'fan-jwt'),
      ),
    );
    await auth.login('fan@example.test', 'password');
    addTearDown(auth.dispose);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthController>.value(value: auth),
          Provider<PaymentHistoryRepository>.value(
            value: _TicketHistoryRepository(),
          ),
        ],
        child: MaterialApp(
          theme: JsoTheme.dark(),
          home: const AccountDashboardScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, -900));
    await tester.pumpAndSettle();

    expect(find.text('Historique des paiements'), findsOneWidget);
    expect(find.text('Billet · Tribune principale'), findsOneWidget);
    expect(find.textContaining('Payé'), findsOneWidget);
    expect(find.text('8.50 TND'), findsOneWidget);
    expect(find.textContaining('Flouci'), findsOneWidget);
  });
}
