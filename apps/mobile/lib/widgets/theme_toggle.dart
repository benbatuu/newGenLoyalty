import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../theme_mode_controller.dart';

/// Tek dokunuşla açık ↔ koyu tema.
class ThemePreferenceMenu extends StatelessWidget {
  const ThemePreferenceMenu({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<ThemeModeController>();
    final isDark = context.isDarkTheme;

    return IconButton(
      tooltip: isDark ? 'Açık temaya geç' : 'Koyu temaya geç',
      onPressed: ctrl.toggle,
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        transitionBuilder: (child, anim) => RotationTransition(
          turns: Tween<double>(begin: 0.85, end: 1).animate(anim),
          child: FadeTransition(opacity: anim, child: child),
        ),
        child: Icon(
          isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
          key: ValueKey(isDark),
        ),
      ),
    );
  }
}

/// Profil satırı — tüm satıra dokununca tema değişir.
class ThemePreferenceRow extends StatelessWidget {
  const ThemePreferenceRow({super.key});

  @override
  Widget build(BuildContext context) {
    final ctrl = context.watch<ThemeModeController>();
    final isDark = context.isDarkTheme;
    final c = context.colors;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: ctrl.toggle,
        borderRadius: BorderRadius.circular(kRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: kBrand.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                  size: 18,
                  color: kBrand,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Tema',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                        color: c.ink,
                      ),
                    ),
                    Text(
                      isDark ? 'Koyu · dokunarak açığa geç' : 'Açık · dokunarak koyuya geç',
                      style: TextStyle(fontSize: 12, color: c.muted, height: 1.35),
                    ),
                  ],
                ),
              ),
              Icon(Icons.swap_horiz_rounded, color: c.mutedLight, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
