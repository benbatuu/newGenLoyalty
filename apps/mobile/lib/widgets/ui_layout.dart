import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';
import 'ui_primitives.dart';

class PagePadding extends StatelessWidget {
  const PagePadding({super.key, required this.child, this.bottom = 32});
  final Widget child;
  final double bottom;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 8, 20, bottom),
      child: child,
    );
  }
}

class PageHeader extends StatelessWidget {
  const PageHeader({
    super.key,
    required this.title,
    this.eyebrow,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? eyebrow;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (eyebrow != null) ...[
                AttioEyebrow(eyebrow!),
                const SizedBox(height: 8),
              ],
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              if (subtitle != null) ...[
                const SizedBox(height: 6),
                Text(
                  subtitle!,
                  style: GoogleFonts.dmSans(
                    color: c.muted,
                    height: 1.4,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Admin login arka planı — indigo + teal radial glow
class AuthBackground extends StatelessWidget {
  const AuthBackground({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      color: c.bg,
      child: Stack(
        children: [
          Positioned(
            top: -80,
            left: -40,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kBrand.withValues(alpha: 0.08),
                    kBrand.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            right: -30,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    kTeal.withValues(alpha: 0.06),
                    kTeal.withValues(alpha: 0),
                  ],
                ),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}
