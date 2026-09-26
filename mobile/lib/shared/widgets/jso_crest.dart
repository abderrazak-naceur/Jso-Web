import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../core/config/jso_theme.dart';

/// Renders the JSO club crest.
///
/// The vector mark is bundled from `assets/jso-club-mark.svg` (a copy of
/// `frontend/public/jso-club-mark.svg`). If loading the asset fails for any
/// reason a simple gold monogram badge is shown as a fallback.
class JsoCrest extends StatelessWidget {
  const JsoCrest({super.key, this.size = 48});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/jso-club-mark.svg',
      width: size,
      height: size,
      fit: BoxFit.contain,
      placeholderBuilder: (_) => _fallback(),
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
