import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:jso_mobile/core/config/jso_theme.dart';
import 'package:jso_mobile/features/auth/auth_controller.dart';
import 'package:jso_mobile/features/auth/change_password_screen.dart';
import 'package:jso_mobile/features/auth/edit_profile_screen.dart';
import 'package:jso_mobile/features/auth/privacy_screen.dart';

import 'support/fake_auth.dart';

Future<AuthController> _authenticated(FakeAuthRepository repo) async {
  final auth = fakeAuthController(
    repository: repo,
    tokenStore: InMemoryTokenStore('stored-jwt'),
  );
  await auth.restoreSession();
  return auth;
}

Future<void> _pump(
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
  group('EditProfileScreen', () {
    testWidgets('saves display name and anniversary opt-in via the '
        'controller', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const EditProfileScreen());
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nom affiché'),
        'Nouveau Nom',
      );
      // Enable the birthday opt-in.
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Enregistrer'));
      await tester.pumpAndSettle();

      expect(repo.profileUpdates, hasLength(1));
      expect(repo.profileUpdates.single['displayName'], 'Nouveau Nom');
      expect(repo.profileUpdates.single['anniversaryOptIn'], isTrue);
    });

    testWidgets('validates a required display name', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const EditProfileScreen());
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nom affiché'),
        '   ',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Enregistrer'));
      await tester.pumpAndSettle();

      expect(find.text('Le nom affiché est requis.'), findsOneWidget);
      expect(repo.profileUpdates, isEmpty);
    });
  });

  group('ChangePasswordScreen', () {
    testWidgets('rejects a short new password locally', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const ChangePasswordScreen());
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mot de passe actuel'),
        'old-password',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nouveau mot de passe'),
        'short',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Mettre à jour'));
      await tester.pumpAndSettle();

      expect(find.text('Au moins 12 caractères.'), findsOneWidget);
      expect(repo.passwordChanges, isEmpty);
    });

    testWidgets('submits a valid password change', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const ChangePasswordScreen());
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Mot de passe actuel'),
        'old-password',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nouveau mot de passe'),
        'a-brand-new-password',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Confirmer le nouveau mot de passe'),
        'a-brand-new-password',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Mettre à jour'));
      await tester.pumpAndSettle();

      expect(repo.passwordChanges, hasLength(1));
      expect(repo.passwordChanges.single['next'], 'a-brand-new-password');
    });
  });

  group('PrivacyScreen (RGPD)', () {
    testWidgets('exports data and shows a summary dialog', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user())
        ..exportData = {
          'profile': {'email': 'supporter@jso.tn'},
          'newsletterSubscriptions': [
            {'email': 'supporter@jso.tn'},
          ],
          'supporterBricks': [],
          'classifiedAds': [],
        };
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const PrivacyScreen());
      await tester.pumpAndSettle();

      await tester.tap(
        find.widgetWithText(OutlinedButton, 'Exporter mes données'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Vos données'), findsOneWidget);
      expect(find.text('supporter@jso.tn'), findsOneWidget);
    });

    testWidgets('cancelling the confirmation does not delete', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      await _pump(tester, auth: auth, child: const PrivacyScreen());
      await tester.pumpAndSettle();

      await tester.tap(
        find.widgetWithText(OutlinedButton, 'Supprimer mon compte'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Supprimer le compte ?'), findsOneWidget);
      await tester.tap(find.widgetWithText(TextButton, 'Annuler'));
      await tester.pumpAndSettle();

      expect(repo.deleteCalls, 0);
      expect(auth.isAuthenticated, isTrue);
    });

    testWidgets('confirming deletes the account and signs out', (tester) async {
      final repo = FakeAuthRepository(meUser: SampleFan.user());
      final auth = await _authenticated(repo);

      // Host the screen below a first route so popUntil(isFirst) has somewhere
      // to land after the deletion.
      await tester.pumpWidget(
        ChangeNotifierProvider<AuthController>.value(
          value: auth,
          child: MaterialApp(
            theme: JsoTheme.dark(),
            home: Builder(
              builder: (context) => Scaffold(
                body: Center(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const PrivacyScreen(),
                      ),
                    ),
                    child: const Text('Ouvrir'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Ouvrir'));
      await tester.pumpAndSettle();

      await tester.tap(
        find.widgetWithText(OutlinedButton, 'Supprimer mon compte'),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(TextButton, 'Supprimer'));
      await tester.pumpAndSettle();

      expect(repo.deleteCalls, 1);
      expect(auth.isAuthenticated, isFalse);
    });
  });
}
