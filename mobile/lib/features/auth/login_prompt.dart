import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';
import '../../shared/snackbars.dart';
import 'login_screen.dart';

/// Invites an anonymous visitor to sign in before a fan-only action
/// (reserving tickets, placing a shop order...).
///
/// Shows a snackbar with a **Se connecter** action that pushes the
/// [LoginScreen]; the visitor comes back to the same screen after logging in.
void showLoginPrompt(
  BuildContext context, {
  String message = 'Connectez-vous pour continuer.',
}) {
  showJsoMessage(
    context,
    message,
    action: SnackBarAction(
      label: 'Se connecter',
      textColor: JsoColors.gold,
      onPressed: () => Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => const LoginScreen())),
    ),
  );
}
