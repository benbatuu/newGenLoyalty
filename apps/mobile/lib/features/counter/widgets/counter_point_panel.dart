import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterPointPanel extends StatelessWidget {
  const CounterPointPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.pointState,
    required this.pointAmount,
    required this.pointCategoryId,
    required this.busy,
    required this.onSelectProgram,
    required this.onCategorySelected,
    required this.onEarnPoints,
    required this.onRedeemPoints,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final PointCustomerState? pointState;
  final TextEditingController pointAmount;
  final String? pointCategoryId;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final void Function(String? categoryId) onCategorySelected;
  final VoidCallback onEarnPoints;
  final void Function(int pointCost, String rewardLabel) onRedeemPoints;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Puan'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'POINT_CARD',
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
              if (pointState != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Bakiye: ${pointState!.balance} puan',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
              ],
              const SizedBox(height: 14),
              TextField(
                onTapOutside: onTapOutsideDismissKeyboard,
                controller: pointAmount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Harcama tutarı (TL)',
                  hintText: '47,50',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              if (pointState != null && pointState!.categories.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Genel'),
                      selected: pointCategoryId == null,
                      onSelected:
                          busy ? null : (_) => onCategorySelected(null),
                    ),
                    ...pointState!.categories.map((cat) {
                      final selected = pointCategoryId == cat.categoryId;
                      final label = cat.multiplier != 1
                          ? '${cat.label ?? cat.categoryId} (${cat.multiplier}x)'
                          : (cat.label ?? cat.categoryId);
                      return ChoiceChip(
                        label: Text(label),
                        selected: selected,
                        onSelected: busy
                            ? null
                            : (_) => onCategorySelected(cat.categoryId),
                      );
                    }),
                  ],
                ),
              ],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: busy || pointAmount.text.trim().isEmpty
                    ? null
                    : onEarnPoints,
                icon: const Icon(Icons.stars_rounded),
                label: const Text('Puan ekle'),
              ),
              if (pointState != null &&
                  pointState!.redeemOptions.any((r) => r.affordable)) ...[
                const SizedBox(height: 18),
                const Divider(height: 1),
                const SizedBox(height: 14),
                Text(
                  'Puanla ödül',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 10),
                ...pointState!.redeemOptions
                    .where((r) => r.affordable)
                    .map(
                      (r) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: OutlinedButton(
                          onPressed: busy
                              ? null
                              : () => onRedeemPoints(r.pointCost, r.rewardLabel),
                          child: Text(
                            '${r.pointCost} puan → ${r.rewardLabel}',
                          ),
                        ),
                      ),
                    ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
