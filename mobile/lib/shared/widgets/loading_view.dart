import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// Full-area loading state: a JSO-gold spinner with an optional label.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: JsoColors.gold),
          if (message != null) ...[
            const SizedBox(height: JsoSpacing.md),
            Text(message!, style: const TextStyle(color: JsoColors.muted)),
          ],
        ],
      ),
    );
  }
}
