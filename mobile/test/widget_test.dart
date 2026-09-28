import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/app.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/data/repositories/tickets_repository.dart';
import 'package:jso_mobile/features/shop/cart_controller.dart';

import 'support/fake_auth.dart';
import 'support/fake_club_content.dart';
import 'support/fake_repository.dart';
import 'support/fake_shop.dart';
import 'support/test_harness.dart';

void main() {
  testWidgets('JsoApp affiche les cinq destinations principales', (
    WidgetTester tester,
  ) async {
    final apiClient = ApiClient();
    final cartController = CartController();
    final authController = fakeAuthController();
    final adminAuthController = fakeAdminAuthController();
    await authController.restoreSession();
    addTearDown(apiClient.dispose);
    addTearDown(cartController.dispose);
    addTearDown(authController.dispose);
    addTearDown(adminAuthController.dispose);

    await tester.pumpWidget(
      JsoApp(
        repository: FakeRepository(homeData: Sample.home()),
        ticketsRepository: TicketsRepository(apiClient),
        clubContentRepository: FakeClubContentRepository(),
        shopRepository: FakeShopRepository(),
        matchCenterRepository: MatchCenterRepository(apiClient),
        cartController: cartController,
        authController: authController,
        adminAuthController: adminAuthController,
      ),
    );
    await tester.pump();

    final navigationFinder = find.byType(BottomNavigationBar);
    expect(navigationFinder, findsOneWidget);

    final navigation = tester.widget<BottomNavigationBar>(navigationFinder);
    expect(navigation.items, hasLength(5));
    expect(
      navigation.items.map((item) => item.label),
      orderedEquals(const [
        'Accueil',
        'Matchs',
        'Boutique',
        'Actualités',
        'Plus',
      ]),
    );
    expect(navigation.backgroundColor, Colors.white);
    expect(navigation.selectedItemColor, JsoColors.navy);
    expect(navigation.unselectedItemColor, JsoColors.inkMuted);

    for (final label in const [
      'Accueil',
      'Matchs',
      'Boutique',
      'Actualités',
      'Plus',
    ]) {
      expect(
        find.descendant(of: navigationFinder, matching: find.text(label)),
        findsOneWidget,
      );
    }

    await tester.tap(
      find.descendant(of: navigationFinder, matching: find.text('Actualités')),
    );
    await tester.pump();
    expect(
      tester.widget<BottomNavigationBar>(navigationFinder).currentIndex,
      3,
    );
  });
}
