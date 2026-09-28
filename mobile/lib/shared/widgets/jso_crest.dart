import 'package:flutter/material.dart';

import '../../core/config/jso_theme.dart';

/// Renders the official JSO club crest.
///
/// The crest is bundled as a raster asset (`assets/jso-crest.png`, a copy of
/// `frontend/public/JSO-official-crest.png`) so the app shows the real club
/// emblem rather than an abstract mark. If the asset fails to load a simple
/// gold monogram badge is shown as a fallback.
class JsoCrest extends StatelessWidget {
  const JsoCrest({super.key, this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/jso-crest.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.medium,
      semanticLabel: 'Blason JSO',
      errorBuilder: (_, _, _) => _fallback(),
    );
  }

  Widget _fallback() {
    return Container(
      width: size,
      height: size,
      decoration: const BoxDecoration(
        color: JsoColors.gold,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        'JSO',
        style: TextStyle(
          color: JsoColors.ink,
          fontWeight: FontWeight.w900,
          fontSize: size * 0.28,
        ),
      ),
    );
  }
}
