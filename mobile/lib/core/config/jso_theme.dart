import 'package:flutter/material.dart';

/// JSO design system.
///
/// Implements the palette, radius scale and typography defined in
/// `docs/DESIGN_SYSTEM.md` and `docs/BRAND_GUIDELINES.md`.
///
/// Typography note: the brand uses **Manrope** for headings and **Inter** for
/// body/UI. Bundling those fonts (via the `google_fonts` package or local
/// assets) is deferred; this theme documents the intent and falls back to the
/// platform default sans-serif so the app stays lightweight for now.
class JsoColors {
  const JsoColors._();

  // Deep surfaces (dark navy base).
  static const Color ink = Color(0xFF040811); // deepest background
  static const Color navy = Color(0xFF071225); // primary surface
  static const Color navy2 = Color(0xFF0B1A33); // panels & hero
  static const Color navy3 = Color(0xFF102748); // cards & active states

  // Brand identity.
  static const Color gold = Color(0xFFF4C542); // primary CTA / accent
  static const Color gold2 = Color(0xFFFFD95A); // highlight & hover

  // Interactive.
  static const Color blue = Color(0xFF2F6BFF); // links / interactive
  static const Color blueBright = Color(0xFF1769E0); // active states
  static const Color cyan = Color(0xFF58E1FF); // live / micro accents

  // Text.
  static const Color white = Color(0xFFF7F9FD); // primary text on dark
  static const Color muted = Color(0xFF9CAAC0); // secondary text
  static const Color muted2 = Color(0xFF708099); // metadata

  // Light surfaces.
  static const Color paper = Color(0xFFF6F8FC); // light background
  static const Color inkText = Color(0xFF0B1730); // primary text on light

  // Borders (subtle, semi-transparent).
  static const Color border = Color(0x17FFFFFF); // rgba(255,255,255,.09)
  static const Color borderHover = Color(0x29FFFFFF); // rgba(255,255,255,.16)
}

/// Radius scale from the design system.
class JsoRadius {
  const JsoRadius._();

  static const double control = 12; // controls: 10-14px
  static const double card = 20; // standard cards: 18-22px
  static const double largeCard = 28; // large cards: 24-30px
  static const double hero = 34; // hero: 32-36px
  static const double pill = 999; // pills
}

/// Spacing scale (8pt-based).
class JsoSpacing {
  const JsoSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
}

/// Builds the JSO [ThemeData]: a dark navy scheme with a gold accent.
class JsoTheme {
  const JsoTheme._();

  /// Intended heading font family (see typography note above).
  static const String headingFontFamily = 'Manrope';

  /// Intended body/UI font family.
  static const String bodyFontFamily = 'Inter';

  static ThemeData dark() {
    const scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: JsoColors.gold,
      onPrimary: JsoColors.ink,
      secondary: JsoColors.blue,
      onSecondary: JsoColors.white,
      tertiary: JsoColors.cyan,
      onTertiary: JsoColors.ink,
      surface: JsoColors.navy,
      onSurface: JsoColors.white,
      surfaceContainerHighest: JsoColors.navy3,
      error: Color(0xFFFF6B6B),
      onError: JsoColors.white,
      outline: JsoColors.border,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: JsoColors.ink,
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: JsoColors.white,
        displayColor: JsoColors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: JsoColors.navy,
        foregroundColor: JsoColors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: JsoColors.navy3,
        elevation: 0,
        margin: const EdgeInsets.symmetric(vertical: JsoSpacing.sm),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.card),
          side: const BorderSide(color: JsoColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: JsoColors.gold,
          foregroundColor: JsoColors.ink,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(JsoRadius.control),
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: JsoSpacing.lg,
            vertical: JsoSpacing.md,
          ),
          textStyle: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: JsoColors.blue),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: JsoColors.gold,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: JsoColors.navy2,
        side: const BorderSide(color: JsoColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.pill),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: JsoColors.navy,
        selectedItemColor: JsoColors.gold,
        unselectedItemColor: JsoColors.muted,
        type: BottomNavigationBarType.fixed,
      ),
      dividerTheme: const DividerThemeData(color: JsoColors.border),
    );
  }
}
