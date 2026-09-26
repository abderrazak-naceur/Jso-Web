import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// Empty state: an icon plus a message when a list/collection has no items.
class EmptyView extends StatelessWidget {
  const EmptyView({
    super.key,
    this.message = 'Nothing here yet',
    this.icon = Icons.inbox_outlined,
  });

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: JsoColors.muted2),
            const SizedBox(height: JsoSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: JsoColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
