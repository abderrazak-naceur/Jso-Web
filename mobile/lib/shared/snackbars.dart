import 'package:flutter/material.dart';

import '../core/config/jso_theme.dart';

/// Shows a short JSO-styled message at the bottom of the current screen.
///
/// Replaces any snackbar already visible so rapid actions don't queue up a
/// backlog of stale messages. [action] optionally adds a gold call to action.
void showJsoMessage(
  BuildContext context,
  String message, {
  SnackBarAction? action,
}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      backgroundColor: JsoColors.navy3,
      content: Text(message, style: const TextStyle(color: JsoColors.white)),
      action: action,
    ),
  );
}
