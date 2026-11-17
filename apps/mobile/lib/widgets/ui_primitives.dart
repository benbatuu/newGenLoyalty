import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';

/// Admin `.section-label` — normal case, medium weight
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Text(
      text,
      style: GoogleFonts.dmSans(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: c.muted,
      ),
    );
  }
}

/// Admin `.attio-eyebrow`
class AttioEyebrow extends StatelessWidget {
  const AttioEyebrow(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.lineSoft),
      ),
      child: Text(
        text,
        style: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: c.muted,
        ),
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.tone = PillTone.neutral,
  });

  final String label;
  final PillTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (bg, fg) = switch (tone) {
      PillTone.success => (c.successSoft, kSuccess),
      PillTone.warning => (c.warningSoft, c.warningFg),
      PillTone.neutral => (c.surface, c.muted),
      PillTone.brand => (c.brandMist, kBrand),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: c.lineSoft),
      ),
      child: Text(
        label,
        style: GoogleFonts.dmSans(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}

enum PillTone { success, warning, neutral, brand }

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 40,
              color: c.mutedLight.withValues(alpha: 0.6),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: GoogleFonts.dmSans(fontWeight: FontWeight.w600),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: GoogleFonts.dmSans(color: c.muted, height: 1.4),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
