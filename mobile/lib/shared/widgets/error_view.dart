import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// Error state: a message and a Retry button that invokes [onRetry].
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    this.message = 'Something went wrong',
    this.onRetry,
    this.icon = Icons.error_outline,
  });

  final String message;
  final VoidCallback? onRetry;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(JsoSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: Theme.of(context).colorScheme.error),
            const SizedBox(height: JsoSpacing.md),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: JsoColors.white),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: JsoSpacing.lg),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
