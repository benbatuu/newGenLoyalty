import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';

class CustomerNoteItem extends StatelessWidget {
  const CustomerNoteItem({super.key, required this.note});

  final CustomerNote note;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(kRadiusSm),
        border: Border.all(color: c.lineSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            note.body,
            style: GoogleFonts.dmSans(
              fontSize: 14,
              height: 1.45,
              color: c.ink,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            shortDate(note.createdAt),
            style: GoogleFonts.dmSans(
              fontSize: 11,
              color: c.muted,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
