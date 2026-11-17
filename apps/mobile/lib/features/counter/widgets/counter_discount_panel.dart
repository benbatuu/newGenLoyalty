import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterDiscountPanel extends StatelessWidget {
  const CounterDiscountPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.discountState,
    required this.discountAmount,
    required this.discountCategoryId,
    required this.busy,
    required this.onSelectProgram,
    required this.onCategorySelected,
    required this.onVerifyDiscount,
    required this.onApplyDiscount,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final DiscountCustomerState? discountState;
  final TextEditingController discountAmount;
  final String? discountCategoryId;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final void Function(String? categoryId) onCategorySelected;
  final VoidCallback onVerifyDiscount;
  final VoidCallback onApplyDiscount;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('İndirim'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'DISCOUNT_CARD',
                programs: programs,
                selectedProgramId: selectedProgramId,
                busy: busy,
                onSelect: onSelectProgram,
              ),
              Text(
                program.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              if (discountState != null) ...[
                const SizedBox(height: 8),
                Text(
                  discountState!.valid
                      ? (discountState!.effective?.label ?? 'Geçerli')
                      : (discountState!.invalidReason ?? 'Geçersiz'),
                  style: TextStyle(
                    color: discountState!.valid
                        ? c.muted
                        : Colors.red.shade700,
                    fontSize: 13,
                  ),
                ),
                if (discountState!.limits.remainingToday != null)
                  Text(
                    'Bugün kalan: ${discountState!.limits.remainingToday}',
                    style: TextStyle(color: c.muted, fontSize: 13),
                  ),
              ],
              if (discountState != null &&
                  discountState!.applicableCategories.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Genel'),
                      selected: discountCategoryId == null,
                      onSelected:
                          busy ? null : (_) => onCategorySelected(null),
                    ),
                    ...discountState!.applicableCategories.map((cat) {
                      return ChoiceChip(
                        label: Text(cat),
                        selected: discountCategoryId == cat,
                        onSelected: busy
                            ? null
                            : (_) => onCategorySelected(cat),
                      );
                    }),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: busy ? null : onVerifyDiscount,
                icon: const Icon(Icons.verified_outlined),
                label: const Text('Doğrula'),
              ),
              const SizedBox(height: 10),
              TextField(
                onTapOutside: onTapOutsideDismissKeyboard,
                controller: discountAmount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Hesap tutarı (TL, opsiyonel)',
                  hintText: '120',
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed:
                    busy || discountState?.valid == false ? null : onApplyDiscount,
                icon: const Icon(Icons.discount_rounded),
                label: const Text('İndirim uygula'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
