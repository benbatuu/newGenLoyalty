import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../theme.dart';

class CustomerEmptyHint extends StatelessWidget {
  const CustomerEmptyHint({
    super.key,
    required this.icon,
    required this.text,
  });

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: c.mutedLight),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.dmSans(
                fontSize: 13,
                color: c.muted,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
