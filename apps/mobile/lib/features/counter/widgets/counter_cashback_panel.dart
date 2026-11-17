import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterCashbackPanel extends StatelessWidget {
  const CounterCashbackPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.cashbackState,
    required this.cashbackAmount,
    required this.cashbackRedeemAmount,
    required this.cashbackBasketAmount,
    required this.cashbackCategoryId,
    required this.busy,
    required this.onSelectProgram,
    required this.onCategorySelected,
    required this.onEarnCashback,
    required this.onRedeemCashback,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final CashbackCustomerState? cashbackState;
  final TextEditingController cashbackAmount;
  final TextEditingController cashbackRedeemAmount;
  final TextEditingController cashbackBasketAmount;
  final String? cashbackCategoryId;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final void Function(String? categoryId) onCategorySelected;
  final VoidCallback onEarnCashback;
  final VoidCallback onRedeemCashback;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Cashback'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'CASHBACK_CARD',
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
              if (cashbackState != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Bakiye: ₺${cashbackState!.balanceTry}'
                      '${cashbackState!.earnPercent > 0 ? ' · %${cashbackState!.earnPercent}' : ''}',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
              ],
              const SizedBox(height: 14),
              TextField(
                onTapOutside: onTapOutsideDismissKeyboard,
                controller: cashbackAmount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Hesap tutarı (TL) — cashback ekle',
                  hintText: '500',
                  prefixIcon: Icon(Icons.account_balance_wallet_outlined),
                ),
              ),
              if (cashbackState != null &&
                  cashbackState!.categories.isNotEmpty) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Genel'),
                      selected: cashbackCategoryId == null,
                      onSelected:
                          busy ? null : (_) => onCategorySelected(null),
                    ),
                    ...cashbackState!.categories.map((cat) {
                      final selected = cashbackCategoryId == cat.categoryId;
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
                onPressed: busy || cashbackAmount.text.trim().isEmpty
                    ? null
                    : onEarnCashback,
                icon: const Icon(Icons.add_rounded),
                label: const Text('Cashback tanımla'),
              ),
              if (cashbackState?.canRedeem == true ||
                  (cashbackState?.balanceKurus ?? 0) > 0) ...[
                const SizedBox(height: 18),
                const Divider(height: 1),
                const SizedBox(height: 14),
                Text(
                  'Bakiye kullan',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 10),
                TextField(
                  onTapOutside: onTapOutsideDismissKeyboard,
                  controller: cashbackBasketAmount,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Sepet tutarı (TL, opsiyonel)',
                    hintText: '180',
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  onTapOutside: onTapOutsideDismissKeyboard,
                  controller: cashbackRedeemAmount,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Kullanılacak tutar (TL)',
                    hintText: '47,50',
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy || cashbackRedeemAmount.text.trim().isEmpty
                      ? null
                      : onRedeemCashback,
                  icon: const Icon(Icons.redeem_rounded),
                  label: const Text('Bakiye kullan'),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
