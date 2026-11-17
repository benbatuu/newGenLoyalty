import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../theme.dart';

class ProgramRow extends StatelessWidget {
  const ProgramRow({
    super.key,
    required this.name,
    required this.type,
    required this.value,
    required this.active,
  });

  final String name;
  final String type;
  final String value;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: active ? c.brandMist : c.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.layers_outlined,
              size: 18,
              color: active ? kBrand : c.mutedLight,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.dmSans(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: c.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  type,
                  style: GoogleFonts.dmSans(
                    fontSize: 11,
                    color: c.muted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            value,
            textAlign: TextAlign.right,
            style: GoogleFonts.dmSans(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: active ? c.ink : c.mutedLight,
            ),
          ),
        ],
      ),
    );
  }
}
