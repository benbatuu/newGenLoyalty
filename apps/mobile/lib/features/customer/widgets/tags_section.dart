import 'package:flutter/material.dart';

import '../../../theme.dart';
import '../../../widgets/ui.dart';
import '../customer_detail_controller.dart';
import 'empty_hint.dart';

class CustomerTagsSection extends StatelessWidget {
  const CustomerTagsSection({
    super.key,
    required this.controller,
    required this.tagInput,
    required this.onAdd,
  });

  final CustomerDetailController controller;
  final TextEditingController tagInput;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (controller.tags.isEmpty)
          const CustomerEmptyHint(
            icon: Icons.sell_outlined,
            text: 'Henüz etiket eklenmemiş',
          )
        else
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: controller.tags
                .map(
                  (t) => StatusPill(
                    label: t,
                    tone: PillTone.neutral,
                  ),
                )
                .toList(),
          ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: tagInput,
                decoration: InputDecoration(
                  hintText: 'Yeni etiket',
                  isDense: true,
                  filled: true,
                  fillColor: c.surface,
                ),
                onTapOutside: onTapOutsideDismissKeyboard,
                onSubmitted: (_) => onAdd(),
              ),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: controller.busy ? null : onAdd,
              style: FilledButton.styleFrom(
                minimumSize: const Size(72, 44),
              ),
              child: const Text('Ekle'),
            ),
          ],
        ),
      ],
    );
  }
}
