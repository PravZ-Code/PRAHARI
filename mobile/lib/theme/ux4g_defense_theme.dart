import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Official UX4G Defense Design Tokens for PRAHARI Bandhu
/// Ministry of Home Affairs (MHA) & Central Reserve Police Force (CRPF)
class Ux4gDefenseTheme {
  // --- MHA / CRPF Primary & Secondary Brand Tokens ---
  static const Color mhaNavy = Color(0xFF4A2BC2);
  static const Color mhaNavyLight = Color(0xFFA391FF);
  static const Color mhaNavyDark = Color(0xFF321A8A);
  static const Color indiaSaffron = Color(0xFF6D4AFF);
  static const Color indiaSaffronDark = Color(0xFF321A8A);
  static const Color defenseGreen = Color(0xFF00522C);
  static const Color defenseGreenLight = Color(0xFF80DA88);
  static const Color crisisRed = Color(0xFF8A1A16);
  static const Color crisisRedLight = Color(0xFFFFB3AE);
  static const Color tacticalAmber = Color(0xFFAD4E00);
  static const Color tacticalAmberLight = Color(0xFFFFC973);
  static const Color infoBlue = Color(0xFF006D75);
  static const Color infoBlueLight = Color(0xFF91E8E0);

  static const Color successSurfaceLight = Color(0xFFDCFCE7);
  static const Color successTextLight = Color(0xFF166534);
  static const Color warningSurfaceLight = Color(0xFFFEF3C7);
  static const Color warningTextLight = Color(0xFF92400E);
  static const Color errorSurfaceLight = Color(0xFFFEE2E2);
  static const Color errorTextLight = Color(0xFF991B1B);
  static const Color infoSurfaceLight = Color(0xFFE0F2FE);
  static const Color infoTextLight = Color(0xFF075985);

  // --- Surfaces (Light Mode) ---
  static const Color bgLight = Color(0xFFFAFAFA);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceSubtleLight = Color(0xFFF5F5F5);
  static const Color borderLight = Color(0xFF737373);
  static const Color textPrimaryLight = Color(0xFF171717);
  static const Color textSecondaryLight = Color(0xFF404040);
  static const Color textMutedLight = Color(0xFF737373);

  // --- Surfaces (Dark / Tactical Night Mode) ---
  static const Color bgDark = Color(0xFF171717);
  static const Color surfaceDark = Color(0xFF0A0A0A);
  static const Color surfaceSubtleDark = Color(0xFF262626);
  static const Color borderDark = Color(0xFFA1A1A1);
  static const Color textPrimaryDark = Color(0xFFFAFAFA);
  static const Color textSecondaryDark = Color(0xFFE5E5E5);
  static const Color textMutedDark = Color(0xFFD9D9D9);
  static const Color successSurfaceDark = Color(0xFF1B5E20);
  static const Color warningSurfaceDark = Color(0xFF5D3200);
  static const Color errorSurfaceDark = Color(0xFF5F1713);
  static const Color infoSurfaceDark = Color(0xFF063F43);

  // --- Elevation Shadows (WCAG 2.1 Level AA) ---
  static List<BoxShadow> elevationLevel1(bool isDark) => [
        BoxShadow(color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.04), blurRadius: 2, offset: const Offset(0, 1)),
        BoxShadow(color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.04), blurRadius: 2, offset: const Offset(0, 1)),
      ];

  static List<BoxShadow> elevationLevel2(bool isDark) => [
        BoxShadow(color: isDark ? Colors.white12 : Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 4)),
        BoxShadow(color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.04), blurRadius: 2, offset: const Offset(0, 1)),
      ];

  static List<BoxShadow> elevationLevel3(bool isDark) => [
        BoxShadow(color: isDark ? Colors.white.withValues(alpha: 0.16) : Colors.black.withValues(alpha: 0.16), blurRadius: 16, offset: const Offset(0, 8)),
        BoxShadow(color: isDark ? Colors.white10 : Colors.black.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 4)),
      ];

  // --- Build ThemeData ---
  static ThemeData buildTheme({required bool isDark, bool isHighContrast = false, double fontScale = 1.0}) {
    final primary = isHighContrast ? Colors.black : (isDark ? mhaNavyLight : mhaNavy);
    final background = isHighContrast ? Colors.black : (isDark ? bgDark : bgLight);
    final surface = isHighContrast ? Colors.black : (isDark ? surfaceDark : surfaceLight);
    final onSurface = isHighContrast ? Colors.white : (isDark ? textPrimaryDark : textPrimaryLight);
    final baseTextTheme = isDark
        ? Typography.material2021().white
        : Typography.material2021().black;

    final notoSansText = GoogleFonts.notoSansTextTheme(baseTextTheme).copyWith(
      displayLarge: TextStyle(
        fontSize: 32 * fontScale,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      headlineMedium: TextStyle(
        fontSize: 22 * fontScale,
        fontWeight: FontWeight.w700,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      titleLarge: TextStyle(
        fontSize: 18 * fontScale,
        fontWeight: FontWeight.w700,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      titleMedium: TextStyle(
        fontSize: 15 * fontScale,
        fontWeight: FontWeight.w600,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      bodyLarge: TextStyle(
        fontSize: 14 * fontScale,
        fontWeight: FontWeight.w500,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      bodyMedium: TextStyle(
        fontSize: 13 * fontScale,
        fontWeight: FontWeight.w400,
        color: isDark ? textSecondaryDark : textSecondaryLight,
      ),
      labelLarge: TextStyle(
        fontSize: 13 * fontScale,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.3,
        color: isDark ? textPrimaryDark : textPrimaryLight,
      ),
      labelSmall: TextStyle(
        fontSize: 11 * fontScale,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
        color: isDark ? textMutedDark : textMutedLight,
      ),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: isDark || isHighContrast ? Brightness.dark : Brightness.light,
      primaryColor: primary,
      scaffoldBackgroundColor: background,
      colorScheme: ColorScheme(
        brightness: isDark || isHighContrast ? Brightness.dark : Brightness.light,
        primary: primary,
        onPrimary: Colors.white,
        secondary: isHighContrast ? Colors.yellow : indiaSaffron,
        onSecondary: Colors.black,
        surface: surface,
        onSurface: onSurface,
        error: crisisRed,
        onError: Colors.white,
      ),
      textTheme: notoSansText,
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? const Color(0xFF0F172A) : mhaNavy,
        elevation: 0,
        scrolledUnderElevation: 2,
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: GoogleFonts.notoSans(
          color: Colors.white,
          fontSize: 16 * fontScale,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(
            color: isDark ? borderDark : borderLight,
            width: 1,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? surfaceSubtleDark : surfaceLight,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: isDark ? borderDark : borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: isDark ? borderDark : borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: BorderSide(color: isHighContrast ? Colors.yellow : primary, width: 2),
        ),
        labelStyle: TextStyle(color: isDark ? textSecondaryDark : textSecondaryLight),
        hintStyle: TextStyle(color: isDark ? textMutedDark : textMutedLight),
      ),
      dividerTheme: DividerThemeData(
        color: isDark ? borderDark : borderLight,
        thickness: 1,
        space: 1,
      ),
    );
  }
}

/// Official GIGW 3.0 Tricolor Identity Strip Widget
class TricolorBar extends StatelessWidget {
  final double height;
  const TricolorBar({super.key, this.height = 4.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Row(
        children: const [
          Expanded(child: ColoredBox(color: Color(0xFFFF9933))), // Saffron
          Expanded(child: ColoredBox(color: Color(0xFFFFFFFF))), // White
          Expanded(child: ColoredBox(color: Color(0xFF138808))), // Green
        ],
      ),
    );
  }
}
