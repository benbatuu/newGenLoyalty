import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const Color kAccent = Color(0xFF1B4332);
const Color kAccentSoft = Color(0xFF2D6A4F);
const Color kAccentMist = Color(0xFFE4EBE6);
const Color kBg = Color(0xFFF3F6F4);
const Color kInk = Color(0xFF122018);
const Color kMuted = Color(0xFF5C6B63);
const Color kLine = Color(0xFFD0D7D2);
const Color kPanel = Color(0xFFFFFFF8);
const Color kGold = Color(0xFFB08968);

ThemeData buildAppTheme() {
  final textTheme = GoogleFonts.sourceSans3TextTheme().apply(
    bodyColor: kInk,
    displayColor: kInk,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: kBg,
    colorScheme: const ColorScheme.light(
      primary: kAccent,
      onPrimary: Colors.white,
      secondary: kAccentSoft,
      onSecondary: Colors.white,
      surface: kPanel,
      onSurface: kInk,
      outline: kLine,
    ),
    textTheme: textTheme.copyWith(
      headlineLarge: GoogleFonts.fraunces(
        fontSize: 32,
        fontWeight: FontWeight.w600,
        color: kInk,
        height: 1.15,
      ),
      headlineMedium: GoogleFonts.fraunces(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: kInk,
      ),
      titleLarge: GoogleFonts.fraunces(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: kInk,
      ),
      titleMedium: textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
      ),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: kBg,
      foregroundColor: kInk,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.fraunces(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: kInk,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: kPanel,
      indicatorColor: kAccentMist,
      elevation: 0,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 12,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? kAccent : kMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? kAccent : kMuted,
        );
      }),
    ),
    cardTheme: CardThemeData(
      color: kPanel,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: kLine),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kLine),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kLine),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: kAccent, width: 1.5),
      ),
      labelStyle: const TextStyle(color: kMuted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kAccent,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kAccent,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        side: const BorderSide(color: kLine),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: kAccentMist,
      selectedColor: kAccent,
      labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    ),
    dividerTheme: const DividerThemeData(color: kLine, thickness: 1, space: 1),
  );
}
