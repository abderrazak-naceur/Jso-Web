import 'package:flutter/material.dart';

/// JSO design system.
///
/// Implements the palette, radius scale and typography defined in
/// `docs/DESIGN_SYSTEM.md` and `docs/BRAND_GUIDELINES.md`.
///
/// Typography note: the brand uses **Manrope** for headings and **Inter** for
/// body/UI. Both families are bundled under `assets/fonts/` and wired into the
/// [ThemeData] below (see [JsoTheme.headingFontFamily] / [bodyFontFamily]).
class JsoColors {
  const JsoColors._();

  // Deep surfaces (brand navy base #071a3a).
  static const Color ink = Color(0xFF04102A); // deepest background
  static const Color navy = Color(0xFF071A3A); // primary surface (brand navy)
  static const Color navy2 = Color(0xFF0C2450); // panels & hero
  static const Color navy3 = Color(0xFF123066); // cards & active states

  // Brand identity.
  static const Color gold = Color(
    0xFFFFD700,
  ); // primary CTA / accent (brand gold)
  static const Color gold2 = Color(0xFFFFE24D); // highlight & hover

  // Interactive.
  static const Color blue = Color(
    0xFF1769E0,
  ); // links / interactive (brand blue)
  static const Color blueBright = Color(0xFF3B86F0); // active states
  static const Color cyan = Color(0xFF58E1FF); // live / micro accents

  // Text.
  static const Color white = Color(0xFFF7F9FD); // primary text on dark
  static const Color muted = Color(0xFF9CAAC0); // secondary text
  static const Color muted2 = Color(0xFF708099); // metadata

  // Light surfaces.
  static const Color paper = Color(0xFFF6F8FC); // light background
  static const Color surface = Color(0xFFFFFFFF); // cards on light
  static const Color surfaceMuted = Color(0xFFEEF2F7); // subtle panels
  static const Color borderLight = Color(0xFFE0E6EF); // light dividers
  static const Color inkText = Color(0xFF0B1730); // primary text on light
  static const Color inkMuted = Color(0xFF66758A); // secondary text on light
  static const Color shadow = Color(0x1F071A3A); // navy-tinted elevation

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

  /// Heading font family — bundled under assets/fonts (see [pubspec.yaml]).
  static const String headingFontFamily = 'Manrope';

  /// Body/UI font family — bundled under assets/fonts.
  static const String bodyFontFamily = 'Inter';

  /// Builds a [TextTheme] that pairs [bodyFontFamily] (Inter) for body/label
  /// text with [headingFontFamily] (Manrope) for display/headline/title text,
  /// keeping the base colours applied by each theme.
  static TextTheme _brandTextTheme(TextTheme base) {
    const heading = headingFontFamily;
    return base.copyWith(
      displayLarge: base.displayLarge?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w800,
      ),
      displayMedium: base.displayMedium?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w800,
      ),
      displaySmall: base.displaySmall?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w800,
      ),
      headlineLarge: base.headlineLarge?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w800,
      ),
      headlineMedium: base.headlineMedium?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w800,
      ),
      headlineSmall: base.headlineSmall?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w700,
      ),
      titleLarge: base.titleLarge?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w700,
      ),
      titleMedium: base.titleMedium?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w700,
      ),
      titleSmall: base.titleSmall?.copyWith(
        fontFamily: heading,
        fontWeight: FontWeight.w600,
      ),
    );
  }

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
      fontFamily: bodyFontFamily,
    );

    return base.copyWith(
      textTheme: _brandTextTheme(
        base.textTheme.apply(
          bodyColor: JsoColors.white,
          displayColor: JsoColors.white,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: JsoColors.navy,
        foregroundColor: JsoColors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: headingFontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: JsoColors.white,
        ),
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

  /// Light paper theme for primary public tabs.
  ///
  /// Apply it locally so existing detail and recovery screens keep the dark
  /// presentation supplied by [dark].
  static ThemeData paper() {
    const scheme = ColorScheme(
      brightness: Brightness.light,
      primary: JsoColors.navy,
      onPrimary: JsoColors.white,
      secondary: JsoColors.gold,
      onSecondary: JsoColors.ink,
      tertiary: JsoColors.blueBright,
      onTertiary: JsoColors.white,
      surface: JsoColors.surface,
      onSurface: JsoColors.inkText,
      surfaceContainerHighest: JsoColors.surfaceMuted,
      error: Color(0xFFB42318),
      onError: JsoColors.white,
      outline: JsoColors.borderLight,
    );

    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: scheme,
      scaffoldBackgroundColor: JsoColors.paper,
      fontFamily: bodyFontFamily,
    );

    return base.copyWith(
      textTheme: _brandTextTheme(
        base.textTheme.apply(
          bodyColor: JsoColors.inkText,
          displayColor: JsoColors.inkText,
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: JsoColors.paper,
        foregroundColor: JsoColors.inkText,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: headingFontFamily,
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: JsoColors.inkText,
        ),
      ),
      cardTheme: CardThemeData(
        color: JsoColors.surface,
        elevation: 0,
        margin: const EdgeInsets.symmetric(vertical: JsoSpacing.sm),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.card),
          side: const BorderSide(color: JsoColors.borderLight),
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
        style: TextButton.styleFrom(foregroundColor: JsoColors.navy),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: JsoColors.navy,
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: JsoColors.surfaceMuted,
        side: const BorderSide(color: JsoColors.borderLight),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(JsoRadius.pill),
        ),
      ),
      dividerTheme: const DividerThemeData(color: JsoColors.borderLight),
    );
  }
}
