import 'package:flutter/material.dart';

import '../../../theme.dart';
import '../../../widgets/ui.dart';
import '../customer_detail_controller.dart';
import 'empty_hint.dart';
import 'note_item.dart';

class CustomerNotesSection extends StatelessWidget {
  const CustomerNotesSection({
    super.key,
    required this.controller,
    required this.noteInput,
    required this.onAdd,
  });

  final CustomerDetailController controller;
  final TextEditingController noteInput;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (controller.notes.isEmpty)
          const CustomerEmptyHint(
            icon: Icons.sticky_note_2_outlined,
            text: 'Henüz not eklenmemiş',
          )
        else
          ...controller.notes.map(
            (n) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: CustomerNoteItem(note: n),
            ),
          ),
        TextField(
          controller: noteInput,
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Yeni not yazın…',
            filled: true,
            fillColor: c.surface,
          ),
          onTapOutside: onTapOutsideDismissKeyboard,
        ),
        const SizedBox(height: 10),
        FilledButton(
          onPressed: controller.busy ? null : onAdd,
          child: const Text('Not kaydet'),
        ),
      ],
    );
  }
}
