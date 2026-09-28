import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/core/api/api_client.dart';
import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/data/repositories/club_content_repository.dart';
import 'package:jso_mobile/data/repositories/match_center_repository.dart';
import 'package:jso_mobile/data/repositories/public_api_repository.dart';
import 'package:jso_mobile/data/repositories/shop_repository.dart';
import 'package:jso_mobile/data/repositories/tickets_repository.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';
import 'package:jso_mobile/features/club/club_screen.dart';
import 'package:jso_mobile/features/shop/cart_controller.dart';
import 'package:jso_mobile/features/shop/shop_screen.dart';
import 'package:provider/provider.dart';

import 'support/fake_club_content.dart';
import 'support/fake_repository.dart';
import 'support/fake_shop.dart';

void main() {
  testWidgets('Plus affiche toutes les entrées et ouvre la Boutique', (
    WidgetTester tester,
  ) async {
    final auth = await anonymousAuth();
    await _pumpPlus(tester, auth: auth);

    expect(find.text('Plus'), findsOneWidget);
    expect(find.text('Mon compte'), findsOneWidget);
    expect(find.text('Se connecter ou créer un compte'), findsOneWidget);

    await tester.tap(find.text('Boutique'));
    await tester.pumpAndSettle();

    expect(find.byType(ShopScreen), findsOneWidget);
    final route = ModalRoute.of(tester.element(find.byType(ShopScreen)));
    expect(route?.settings.name, ShopScreen.routeName);
    expect(tester.takeException(), isNull);

    await tester.pageBack();
    await tester.pumpAndSettle();

    for (final label in const [
      'Boutique',
      'Agenda du club',
      'Médias',
      'Sponsors',
      'Documents',
      'Questions fréquentes',
      'Musée du club',
      'Écoles & partenaires',
    ]) {
      await _expectPlusEntry(tester, label);
    }
    expect(tester.takeException(), isNull);
  });

  testWidgets('Plus affiche le supporter connecté dans Mon compte', (
    WidgetTester tester,
  ) async {
    final auth = await signedInAuth();
    await _pumpPlus(tester, auth: auth);

    expect(find.text('Mon compte'), findsOneWidget);
    expect(find.text('Sami Ultras'), findsOneWidget);
    expect(find.text('supporter@jso.tn'), findsOneWidget);
    expect(find.text('Se connecter ou créer un compte'), findsNothing);
  });
}

Future<void> _pumpPlus(
  WidgetTester tester, {
  required AuthController auth,
}) async {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final apiClient = ApiClient();
  final cartController = CartController();
  addTearDown(apiClient.dispose);
  addTearDown(cartController.dispose);
  addTearDown(auth.dispose);

  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<PublicApiRepository>.value(value: FakeRepository()),
        Provider<TicketsRepository>.value(value: TicketsRepository(apiClient)),
        Provider<ClubContentRepository>.value(
          value: FakeClubContentRepository(),
        ),
        Provider<ShopRepository>.value(value: FakeShopRepository()),
        Provider<MatchCenterRepository>.value(
          value: MatchCenterRepository(apiClient),
        ),
        ChangeNotifierProvider<CartController>.value(value: cartController),
        ChangeNotifierProvider<AuthController>.value(value: auth),
      ],
      child: MaterialApp(theme: JsoTheme.dark(), home: const ClubScreen()),
    ),
  );
  await tester.pump();
}

Future<void> _expectPlusEntry(WidgetTester tester, String label) async {
  final entry = find.text(label);
  final scrollable = find.descendant(
    of: find.byKey(const Key('plus-scroll-view')),
    matching: find.byType(Scrollable),
  );
  expect(scrollable, findsOneWidget);
  await tester.scrollUntilVisible(entry, 180, scrollable: scrollable);
  expect(entry, findsOneWidget);
}
