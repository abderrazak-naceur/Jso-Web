import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:jso_mobile/core/api/api_exception.dart';
import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';
import 'package:jso_mobile/features/auth/login_screen.dart';
import 'package:jso_mobile/features/auth/profile_screen.dart';

import 'support/fake_auth.dart';

/// Pumps [child] inside a MaterialApp providing [auth] via
/// [ChangeNotifierProvider], mirroring the real app wiring.
Future<void> pumpWithAuth(
  WidgetTester tester, {
  required AuthController auth,
  required Widget child,
}) {
  return tester.pumpWidget(
    ChangeNotifierProvider<AuthController>.value(
      value: auth,
      child: MaterialApp(theme: JsoTheme.dark(), home: child),
    ),
  );
}

void main() {
  group('LoginScreen', () {
    testWidgets('login success authenticates and profile shows the '
        'display name', (tester) async {
      final tokenStore = InMemoryTokenStore();
      final auth = fakeAuthController(
        repository: FakeAuthRepository(
          loginResult: SampleFan.authResult(
            token: 'fresh-jwt',
            user: SampleFan.user(displayName: 'Sami Ultras'),
          ),
        ),
        tokenStore: tokenStore,
      );
      // No stored token -> resolves to the anonymous state.
      await auth.restoreSession();

      // Start on the (anonymous) profile, then push the login form the same
      // way the app does, so a successful login pops back to the profile.
      await pumpWithAuth(tester, auth: auth, child: const ProfileScreen());
      await tester.tap(find.widgetWithText(ElevatedButton, 'Se connecter'));
      await tester.pumpAndSettle();
      expect(find.byType(LoginScreen), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Adresse e-mail'),
        'supporter@jso.tn',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mot de passe'),
        'a-valid-password',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Se connecter'));
      await tester.pumpAndSettle();

      expect(auth.isAuthenticated, isTrue);
      expect(tokenStore.token, 'fresh-jwt');
      // Back on the profile, which now shows the authenticated fan.
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.text('Sami Ultras'), findsOneWidget);
      expect(find.text('Se déconnecter'), findsOneWidget);
    });

    testWidgets('login failure (401) shows the French error and stays on '
        'the form', (tester) async {
      final auth = fakeAuthController(
        repository: FakeAuthRepository(
          loginError: const InvalidCredentialsException(),
        ),
      );

      await pumpWithAuth(tester, auth: auth, child: const LoginScreen());

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Adresse e-mail'),
        'supporter@jso.tn',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mot de passe'),
        'wrong-password',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Se connecter'));
      await tester.pumpAndSettle();

      expect(find.text('Identifiants invalides.'), findsOneWidget);
      expect(auth.isAuthenticated, isFalse);
      // Still on the login form.
      expect(find.byType(LoginScreen), findsOneWidget);
    });
  });

  group('AuthController session', () {
    testWidgets('session restore on startup yields an authenticated state '
        'showing the user', (tester) async {
      final tokenStore = InMemoryTokenStore('stored-jwt');
      final auth = fakeAuthController(
        repository: FakeAuthRepository(
          meUser: SampleFan.user(displayName: 'Rania Fan'),
        ),
        tokenStore: tokenStore,
      );

      await auth.restoreSession();
      expect(auth.isAuthenticated, isTrue);

      await pumpWithAuth(tester, auth: auth, child: const ProfileScreen());
      await tester.pumpAndSettle();

      expect(find.text('Rania Fan'), findsOneWidget);
      expect(find.text('supporter@jso.tn'), findsOneWidget);
    });

    testWidgets('logout clears state back to anonymous and empties the '
        'token store', (tester) async {
      final tokenStore = InMemoryTokenStore('stored-jwt');
      final auth = fakeAuthController(
        repository: FakeAuthRepository(meUser: SampleFan.user()),
        tokenStore: tokenStore,
      );
      await auth.restoreSession();
      expect(auth.isAuthenticated, isTrue);

      await pumpWithAuth(tester, auth: auth, child: const ProfileScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Se déconnecter'));
      await tester.pumpAndSettle();

      expect(auth.status, AuthStatus.anonymous);
      expect(auth.user, isNull);
      expect(tokenStore.token, isNull);
      // The anonymous call-to-action is now visible.
      expect(find.text('Se connecter'), findsOneWidget);
      expect(find.text('Créer un compte'), findsOneWidget);
    });
  });
}
