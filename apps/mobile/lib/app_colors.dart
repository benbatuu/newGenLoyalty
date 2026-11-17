import 'package:flutter/material.dart';

/// Semantic palette — light/dark via [ThemeExtension].
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.bg,
    required this.panel,
    required this.surface,
    required this.wash,
    required this.ink,
    required this.muted,
    required this.mutedLight,
    required this.line,
    required this.lineSoft,
    required this.accent,
    required this.accentForeground,
    required this.accentDeep,
    required this.brandMist,
    required this.brandSoft,
    required this.successSoft,
    required this.dangerSoft,
    required this.warningSoft,
    required this.warningFg,
    required this.cardShadow,
    required this.navBarBg,
    required this.navSelectedBg,
    required this.navSelectedFg,
    required this.navUnselectedFg,
    required this.heroStart,
    required this.heroEnd,
    required this.heroShadow,
    required this.snackBarBg,
    required this.snackBarFg,
    required this.fabBg,
    required this.fabFg,
    required this.chipSelectedFg,
    required this.inputFill,
    required this.scanFrame,
  });

  final Color bg;
  final Color panel;
  final Color surface;
  final Color wash;
  final Color ink;
  final Color muted;
  final Color mutedLight;
  final Color line;
  final Color lineSoft;
  final Color accent;
  final Color accentForeground;
  final Color accentDeep;
  final Color brandMist;
  final Color brandSoft;
  final Color successSoft;
  final Color dangerSoft;
  final Color warningSoft;
  final Color warningFg;
  final Color cardShadow;
  final Color navBarBg;
  final Color navSelectedBg;
  final Color navSelectedFg;
  final Color navUnselectedFg;
  final Color heroStart;
  final Color heroEnd;
  final Color heroShadow;
  final Color snackBarBg;
  final Color snackBarFg;
  final Color fabBg;
  final Color fabFg;
  final Color chipSelectedFg;
  final Color inputFill;
  final Color scanFrame;

  static const light = AppColors(
    bg: Color(0xFFF7F9F3),
    panel: Color(0xFFFFFFFF),
    surface: Color(0xFFF0F0F0),
    wash: Color(0xFFECEEE8),
    ink: Color(0xFF000000),
    muted: Color(0xFF333333),
    mutedLight: Color(0xFF555555),
    line: Color(0xFFD7D7D7),
    lineSoft: Color(0x14000000),
    accent: Color(0xFF000000),
    accentForeground: Color(0xFFFFFFFF),
    accentDeep: Color(0xFF171717),
    brandMist: Color(0xFFEEF2FF),
    brandSoft: Color(0x1A4F46E5),
    successSoft: Color(0xFFECFDF3),
    dangerSoft: Color(0xFFFEF2F2),
    warningSoft: Color(0xFFFFF7ED),
    warningFg: Color(0xFF9A3412),
    cardShadow: Color(0x0A000000),
    navBarBg: Color(0xFFFFFFFF),
    navSelectedBg: Color(0xFF000000),
    navSelectedFg: Color(0xFFFFFFFF),
    navUnselectedFg: Color(0xFF555555),
    heroStart: Color(0xFF000000),
    heroEnd: Color(0xFF352F8C),
    heroShadow: Color(0x1F000000),
    snackBarBg: Color(0xFF000000),
    snackBarFg: Color(0xFFFFFFFF),
    fabBg: Color(0xFF000000),
    fabFg: Color(0xFFFFFFFF),
    chipSelectedFg: Color(0xFFFFFFFF),
    inputFill: Color(0xFFFFFFFF),
    scanFrame: Color(0xFF000000),
  );

  static const dark = AppColors(
    bg: Color(0xFF0E0E0D),
    panel: Color(0xFF1A1A18),
    surface: Color(0xFF242422),
    wash: Color(0xFF2C2C2A),
    ink: Color(0xFFF4F4F0),
    muted: Color(0xFFA3A39A),
    mutedLight: Color(0xFF7A7A72),
    line: Color(0xFF3A3A36),
    lineSoft: Color(0x14FFFFFF),
    accent: Color(0xFFF4F4F0),
    accentForeground: Color(0xFF0E0E0D),
    accentDeep: Color(0xFFE8E8E4),
    brandMist: Color(0xFF252347),
    brandSoft: Color(0x334F46E5),
    successSoft: Color(0xFF142A1C),
    dangerSoft: Color(0xFF2A1414),
    warningSoft: Color(0xFF2A2010),
    warningFg: Color(0xFFFBBF24),
    cardShadow: Color(0x40000000),
    navBarBg: Color(0xFF1A1A18),
    navSelectedBg: Color(0xFFF4F4F0),
    navSelectedFg: Color(0xFF0E0E0D),
    navUnselectedFg: Color(0xFF7A7A72),
    heroStart: Color(0xFF1A1A18),
    heroEnd: Color(0xFF3D3894),
    heroShadow: Color(0x40000000),
    snackBarBg: Color(0xFFF4F4F0),
    snackBarFg: Color(0xFF0E0E0D),
    fabBg: Color(0xFFF4F4F0),
    fabFg: Color(0xFF0E0E0D),
    chipSelectedFg: Color(0xFFFFFFFF),
    inputFill: Color(0xFF242422),
    scanFrame: Color(0xFFF4F4F0),
  );

  @override
  AppColors copyWith({
    Color? bg,
    Color? panel,
    Color? surface,
    Color? wash,
    Color? ink,
    Color? muted,
    Color? mutedLight,
    Color? line,
    Color? lineSoft,
    Color? accent,
    Color? accentForeground,
    Color? accentDeep,
    Color? brandMist,
    Color? brandSoft,
    Color? successSoft,
    Color? dangerSoft,
    Color? warningSoft,
    Color? warningFg,
    Color? cardShadow,
    Color? navBarBg,
    Color? navSelectedBg,
    Color? navSelectedFg,
    Color? navUnselectedFg,
    Color? heroStart,
    Color? heroEnd,
    Color? heroShadow,
    Color? snackBarBg,
    Color? snackBarFg,
    Color? fabBg,
    Color? fabFg,
    Color? chipSelectedFg,
    Color? inputFill,
    Color? scanFrame,
  }) {
    return AppColors(
      bg: bg ?? this.bg,
      panel: panel ?? this.panel,
      surface: surface ?? this.surface,
      wash: wash ?? this.wash,
      ink: ink ?? this.ink,
      muted: muted ?? this.muted,
      mutedLight: mutedLight ?? this.mutedLight,
      line: line ?? this.line,
      lineSoft: lineSoft ?? this.lineSoft,
      accent: accent ?? this.accent,
      accentForeground: accentForeground ?? this.accentForeground,
      accentDeep: accentDeep ?? this.accentDeep,
      brandMist: brandMist ?? this.brandMist,
      brandSoft: brandSoft ?? this.brandSoft,
      successSoft: successSoft ?? this.successSoft,
      dangerSoft: dangerSoft ?? this.dangerSoft,
      warningSoft: warningSoft ?? this.warningSoft,
      warningFg: warningFg ?? this.warningFg,
      cardShadow: cardShadow ?? this.cardShadow,
      navBarBg: navBarBg ?? this.navBarBg,
      navSelectedBg: navSelectedBg ?? this.navSelectedBg,
      navSelectedFg: navSelectedFg ?? this.navSelectedFg,
      navUnselectedFg: navUnselectedFg ?? this.navUnselectedFg,
      heroStart: heroStart ?? this.heroStart,
      heroEnd: heroEnd ?? this.heroEnd,
      heroShadow: heroShadow ?? this.heroShadow,
      snackBarBg: snackBarBg ?? this.snackBarBg,
      snackBarFg: snackBarFg ?? this.snackBarFg,
      fabBg: fabBg ?? this.fabBg,
      fabFg: fabFg ?? this.fabFg,
      chipSelectedFg: chipSelectedFg ?? this.chipSelectedFg,
      inputFill: inputFill ?? this.inputFill,
      scanFrame: scanFrame ?? this.scanFrame,
    );
  }

  @override
  AppColors lerp(AppColors? other, double t) {
    if (other == null) return this;
    return AppColors(
      bg: Color.lerp(bg, other.bg, t)!,
      panel: Color.lerp(panel, other.panel, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      wash: Color.lerp(wash, other.wash, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      muted: Color.lerp(muted, other.muted, t)!,
      mutedLight: Color.lerp(mutedLight, other.mutedLight, t)!,
      line: Color.lerp(line, other.line, t)!,
      lineSoft: Color.lerp(lineSoft, other.lineSoft, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      accentForeground: Color.lerp(accentForeground, other.accentForeground, t)!,
      accentDeep: Color.lerp(accentDeep, other.accentDeep, t)!,
      brandMist: Color.lerp(brandMist, other.brandMist, t)!,
      brandSoft: Color.lerp(brandSoft, other.brandSoft, t)!,
      successSoft: Color.lerp(successSoft, other.successSoft, t)!,
      dangerSoft: Color.lerp(dangerSoft, other.dangerSoft, t)!,
      warningSoft: Color.lerp(warningSoft, other.warningSoft, t)!,
      warningFg: Color.lerp(warningFg, other.warningFg, t)!,
      cardShadow: Color.lerp(cardShadow, other.cardShadow, t)!,
      navBarBg: Color.lerp(navBarBg, other.navBarBg, t)!,
      navSelectedBg: Color.lerp(navSelectedBg, other.navSelectedBg, t)!,
      navSelectedFg: Color.lerp(navSelectedFg, other.navSelectedFg, t)!,
      navUnselectedFg: Color.lerp(navUnselectedFg, other.navUnselectedFg, t)!,
      heroStart: Color.lerp(heroStart, other.heroStart, t)!,
      heroEnd: Color.lerp(heroEnd, other.heroEnd, t)!,
      heroShadow: Color.lerp(heroShadow, other.heroShadow, t)!,
      snackBarBg: Color.lerp(snackBarBg, other.snackBarBg, t)!,
      snackBarFg: Color.lerp(snackBarFg, other.snackBarFg, t)!,
      fabBg: Color.lerp(fabBg, other.fabBg, t)!,
      fabFg: Color.lerp(fabFg, other.fabFg, t)!,
      chipSelectedFg: Color.lerp(chipSelectedFg, other.chipSelectedFg, t)!,
      inputFill: Color.lerp(inputFill, other.inputFill, t)!,
      scanFrame: Color.lerp(scanFrame, other.scanFrame, t)!,
    );
  }
}

extension AppThemeX on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>()!;
  bool get isDarkTheme => Theme.of(this).brightness == Brightness.dark;
}
