import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models.dart';
import '../theme.dart';
import 'ui_primitives.dart';

class PremiumCard extends StatelessWidget {
  const PremiumCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final card = Container(
      width: double.infinity,
      padding: padding,
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(kRadius),
        border: Border.all(color: c.lineSoft),
        boxShadow: [
          BoxShadow(
            color: c.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
    if (onTap == null) return card;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(kRadius),
        child: card,
      ),
    );
  }
}

class MetricTile extends StatelessWidget {
  const MetricTile({
    super.key,
    required this.label,
    required this.value,
    this.hint,
    this.accent = false,
  });

  final String label;
  final String value;
  final String? hint;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PremiumCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionLabel(label),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: accent ? kBrand : c.ink,
                  fontSize: 26,
                ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 4),
            Text(
              hint!,
              style: GoogleFonts.dmSans(fontSize: 11, color: c.mutedLight),
            ),
          ],
        ],
      ),
    );
  }
}

class HubTile extends StatelessWidget {
  const HubTile({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.tone = kBrand,
    this.invertedIcon = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color tone;
  final bool invertedIcon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final solid = invertedIcon || tone == c.accent;
    return PremiumCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: solid ? c.accent : tone.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(kRadiusSm),
            ),
            child: Icon(
              icon,
              color: solid ? c.accentForeground : tone,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.dmSans(color: c.muted, fontSize: 13),
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: c.mutedLight.withValues(alpha: 0.7),
          ),
        ],
      ),
    );
  }
}

class WeekChart extends StatelessWidget {
  const WeekChart({super.key, required this.days});

  final List<DayPoint> days;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    if (days.isEmpty) return const SizedBox.shrink();
    final maxVal = days
        .map((d) => d.stamps > d.redeems ? d.stamps : d.redeems)
        .fold<int>(0, (a, b) => a > b ? a : b)
        .clamp(1, 999);

    return PremiumCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Son 7 gün',
            style: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 15),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 120,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: days.map((d) {
                final stampH = (d.stamps / maxVal) * 88;
                final redeemH = (d.redeems / maxVal) * 88;
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 8,
                              height: stampH.clamp(4, 88),
                              decoration: BoxDecoration(
                                color: kBrand,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                            const SizedBox(width: 3),
                            Container(
                              width: 8,
                              height: redeemH.clamp(4, 88),
                              decoration: BoxDecoration(
                                color: kAmber,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          d.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.dmSans(
                            fontSize: 10,
                            color: c.mutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _legendDot(kBrand, 'Damga'),
              const SizedBox(width: 14),
              _legendDot(kAmber, 'Ödül'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Builder(
      builder: (context) {
        final c = context.colors;
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.dmSans(fontSize: 11, color: c.mutedLight),
            ),
          ],
        );
      },
    );
  }
}

class GradientHero extends StatelessWidget {
  const GradientHero({
    super.key,
    required this.title,
    required this.subtitle,
    this.color,
  });

  final String title;
  final String subtitle;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bg = color ?? c.accent;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(kRadius),
        boxShadow: [
          BoxShadow(
            color: c.cardShadow,
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: color != null
                      ? Colors.white
                      : c.accentForeground,
                ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: GoogleFonts.dmSans(
              color: (color != null ? Colors.white : c.accentForeground)
                  .withValues(alpha: 0.88),
              height: 1.4,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
