import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

export 'app_colors.dart';

/// Admin + web ile uyumlu tasarım token'ları (Attio-style, DM Sans).

// Brand & semantic — tema bağımsız
const Color kBrand = Color(0xFF4F46E5);
const Color kTeal = Color(0xFF14B8A6);
const Color kAmber = Color(0xFFF59E0B);
const Color kSuccess = Color(0xFF15803D);
const Color kDanger = Color(0xFFDC2626);
const Color kGold = kAmber;

// Legacy aliases
const Color kAccentSoft = kBrand;
const Color kAccentMist = Color(0xFFEEF2FF);

const double kRadius = 12;
const double kRadiusSm = 8;
const double kRadiusLg = 16;

TextStyle _displayStyle({
  required AppColors colors,
  required double size,
  FontWeight weight = FontWeight.w600,
}) {
  return GoogleFonts.dmSans(
    fontSize: size,
    fontWeight: weight,
    color: colors.ink,
    letterSpacing: -0.4,
    height: 1.15,
  );
}

ThemeData buildAppTheme(Brightness brightness) {
  final colors = brightness == Brightness.dark ? AppColors.dark : AppColors.light;
  final base = GoogleFonts.dmSansTextTheme(
    ThemeData(brightness: brightness).textTheme,
  ).apply(
    bodyColor: colors.ink,
    displayColor: colors.ink,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: colors.bg,
    extensions: [colors],
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: colors.accent,
      onPrimary: colors.accentForeground,
      secondary: kBrand,
      onSecondary: Colors.white,
      tertiary: kTeal,
      error: kDanger,
      onError: Colors.white,
      surface: colors.panel,
      onSurface: colors.ink,
      outline: colors.line,
    ),
    textTheme: base.copyWith(
      headlineLarge: _displayStyle(colors: colors, size: 30),
      headlineMedium: _displayStyle(colors: colors, size: 22),
      titleLarge: _displayStyle(colors: colors, size: 18),
      titleMedium: GoogleFonts.dmSans(
        fontWeight: FontWeight.w600,
        fontSize: 15,
        letterSpacing: -0.2,
        color: colors.ink,
      ),
      bodyMedium: GoogleFonts.dmSans(
        fontSize: 14,
        height: 1.45,
        color: colors.ink,
      ),
      bodySmall: GoogleFonts.dmSans(
        fontSize: 13,
        height: 1.4,
        color: colors.muted,
      ),
      labelLarge: GoogleFonts.dmSans(
        fontWeight: FontWeight.w600,
        fontSize: 14,
        color: colors.ink,
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: colors.bg,
      foregroundColor: colors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: _displayStyle(colors: colors, size: 20),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: colors.navBarBg,
      indicatorColor: colors.brandMist,
      elevation: 0,
      height: 68,
      surfaceTintColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
          color: selected ? kBrand : colors.navUnselectedFg,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? kBrand : colors.navUnselectedFg,
        );
      }),
    ),
    cardTheme: CardThemeData(
      color: colors.panel,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadius),
        side: BorderSide(color: colors.lineSoft, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: colors.inputFill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusSm),
        borderSide: BorderSide(color: colors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusSm),
        borderSide: BorderSide(color: colors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadiusSm),
        borderSide: const BorderSide(color: kBrand, width: 1.5),
      ),
      labelStyle: GoogleFonts.dmSans(fontSize: 13, color: colors.muted),
      hintStyle: GoogleFonts.dmSans(fontSize: 14, color: colors.mutedLight),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: colors.accent,
        foregroundColor: colors.accentForeground,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(kRadiusSm),
        ),
        textStyle: GoogleFonts.dmSans(
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: colors.ink,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        side: BorderSide(color: colors.line),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(kRadiusSm),
        ),
        textStyle: GoogleFonts.dmSans(
          fontWeight: FontWeight.w600,
          fontSize: 14,
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: colors.surface,
      selectedColor: kBrand,
      labelStyle: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w500),
      secondaryLabelStyle: GoogleFonts.dmSans(
        fontSize: 13,
        fontWeight: FontWeight.w600,
        color: colors.chipSelectedFg,
      ),
      side: BorderSide(color: colors.lineSoft),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    ),
    dividerTheme: DividerThemeData(
      color: colors.lineSoft,
      thickness: 1,
      space: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: colors.snackBarBg,
      contentTextStyle: GoogleFonts.dmSans(
        color: colors.snackBarFg,
        fontSize: 14,
      ),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadiusSm),
      ),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: kBrand),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: colors.fabBg,
      foregroundColor: colors.fabFg,
      elevation: 6,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: colors.panel,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadius),
        side: BorderSide(color: colors.lineSoft),
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: colors.panel,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(kRadiusLg)),
      ),
    ),
  );
}
