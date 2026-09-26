import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// A resilient wrapper over [Image.network].
///
/// Uses a [loadingBuilder] to show a subtle progress indicator while bytes
/// arrive and an [errorBuilder] so a missing/broken URL (or a null/empty one)
/// degrades to a neutral placeholder icon instead of crashing the screen.
class RemoteImage extends StatelessWidget {
  const RemoteImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.placeholderIcon = Icons.image_outlined,
  });

  final String? url;
  final BoxFit fit;
  final double? width;
  final double? height;
  final IconData placeholderIcon;

  @override
  Widget build(BuildContext context) {
    final src = url?.trim() ?? '';
    if (src.isEmpty) {
      return _placeholder();
    }

    return Image.network(
      src,
      fit: fit,
      width: width,
      height: height,
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return _box(
          child: const Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: JsoColors.gold,
              ),
            ),
          ),
        );
      },
      errorBuilder: (context, error, stackTrace) => _placeholder(),
    );
  }

  Widget _placeholder() {
    return _box(
      child: Center(
        child: Icon(placeholderIcon, color: JsoColors.muted2, size: 32),
      ),
    );
  }

  Widget _box({required Widget child}) {
    return Container(
      width: width,
      height: height,
      color: JsoColors.navy2,
      child: child,
    );
  }
}
