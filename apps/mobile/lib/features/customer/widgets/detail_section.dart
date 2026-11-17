import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../theme.dart';
import '../../../widgets/ui.dart';

class DetailSection extends StatelessWidget {
  const DetailSection({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 2, bottom: 8),
          child: Text(
            title,
            style: GoogleFonts.dmSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: c.muted,
              letterSpacing: 0.15,
            ),
          ),
        ),
        PremiumCard(
          padding: const EdgeInsets.all(16),
          child: child,
        ),
      ],
    );
  }
}
