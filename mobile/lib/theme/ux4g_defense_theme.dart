import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Official UX4G Defense Design Tokens for PRAHARI Bandhu
/// Ministry of Home Affairs (MHA) & Central Reserve Police Force (CRPF)
class Ux4gDefenseTheme {
  // --- MHA / CRPF Primary & Secondary Brand Tokens ---
  static const Color mhaNavy = Color(0xFF0C3866);
  static const Color mhaNavyLight = Color(0xFF1B4E8C);
  static const Color mhaNavyDark = Color(0xFF07213D);
  static const Color indiaSaffron = Color(0xFFFF9933);
  static const Color indiaSaffronDark = Color(0xFFE07E1A);
  static const Color defenseGreen = Color(0xFF138808);
  static const Color defenseGreenLight = Color(0xFF22C55E);
  static const Color crisisRed = Color(0xFFD32F2F);
  static const Color crisisRedLight = Color(0xFFEF4444);
  static const Color tacticalAmber = Color(0xFFED6C02);
  static const Color tacticalAmberLight = Color(0xFFF59E0B);
  static const Color infoBlue = Color(0xFF0288D1);
  static const Color infoBlueLight = Color(0xFF38BDF8);

  // --- Surfaces (Light Mode) ---
  static const Color bgLight = Color(0xFFF4F6F9);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceSubtleLight = Color(0xFFF1F5F9);
  static const Color borderLight = Color(0xFFCBD5E1);
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF475569);
  static const Color textMutedLight = Color(0xFF64748B);

  // --- Surfaces (Dark / Tactical Night Mode) ---
  static const Color bgDark = Color(0xFF0A0F1D);
  static const Color surfaceDark = Color(0xFF131D31);
  static const Color surfaceSubtleDark = Color(0xFF1E293B);
  static const Color borderDark = Color(0xFF243356);
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textMutedDark = Color(0xFF64748B);

  // --- Elevation Shadows (WCAG 2.1 Level AA) ---
  static List<BoxShadow> elevationLevel1(bool isDark) => [
        BoxShadow(
          color: isDark ? Colors.black38 : const Color(0x140C3866),
          blurRadius: 4,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> elevationLevel2(bool isDark) => [
        BoxShadow(
          color: isDark ? Colors.black45 : const Color(0x1A0C3866),
          blurRadius: 8,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> elevationLevel3(bool isDark) => [
        BoxShadow(
          color: isDark ? Colors.black54 : const Color(0x240C3866),
          blurRadius: 16,
          offset: const Offset(0, 8),
        ),
      ];

  // --- Build ThemeData ---
  static ThemeData buildTheme({required bool isDark, double fontScale = 1.0}) {
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
      brightness: isDark ? Brightness.dark : Brightness.light,
      primaryColor: mhaNavy,
      scaffoldBackgroundColor: isDark ? bgDark : bgLight,
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: isDark ? const Color(0xFF60A5FA) : mhaNavy,
        onPrimary: Colors.white,
        secondary: indiaSaffron,
        onSecondary: const Color(0xFF1E293B),
        surface: isDark ? surfaceDark : surfaceLight,
        onSurface: isDark ? textPrimaryDark : textPrimaryLight,
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
        color: isDark ? surfaceDark : surfaceLight,
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
          borderSide: const BorderSide(color: mhaNavy, width: 2),
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
