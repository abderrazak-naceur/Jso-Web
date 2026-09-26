import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jso_mobile/app.dart';

import 'support/fake_auth.dart';
import 'support/fake_repository.dart';
import 'support/test_harness.dart';

void main() {
  testWidgets('JsoApp renders the bottom-navigation shell with five tabs', (
    WidgetTester tester,
  ) async {
    // Use a fake repository so the Home tab does not hit the network, and a
    // fake AuthController so the account entry point wires up without secure
    // storage or the network.
    final repository = FakeRepository(homeData: Sample.home());
    final auth = fakeAuthController();

    await tester.pumpWidget(
      JsoApp(repository: repository, authController: auth),
    );
    await tester.pump();

    expect(find.byType(BottomNavigationBar), findsOneWidget);
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Matches'), findsOneWidget);
    expect(find.text('News'), findsOneWidget);
    expect(find.text('Media'), findsOneWidget);
    expect(find.text('Club'), findsOneWidget);
  });
}
