import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';

class CounterStampPanel extends StatelessWidget {
  const CounterStampPanel({
    super.key,
    required this.selected,
    required this.stampsRequired,
    required this.rewardLabel,
    required this.program,
    required this.primaryMultiStamp,
    required this.showClassicStamp,
    required this.multiStampRequired,
    required this.multiStampTiers,
    required this.selectedChipId,
    required this.busy,
    required this.onChipSelected,
    required this.onStamp,
    required this.onRedeem,
    required this.onWalletInvite,
  });

  final Customer selected;
  final int? stampsRequired;
  final String? rewardLabel;
  final LoyaltyProgram? program;
  final ProgramSummary? primaryMultiStamp;
  final bool showClassicStamp;
  final int multiStampRequired;
  final List<ProgramTier> multiStampTiers;
  final String? selectedChipId;
  final bool busy;
  final void Function(String chipId) onChipSelected;
  final VoidCallback onStamp;
  final void Function({String? tierId, String? rewardLabel}) onRedeem;
  final VoidCallback onWalletInvite;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final required = stampsRequired ?? 10;
    final progress =
        (selected.stampCount / required).clamp(0.0, 1.0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 14),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      formatPhone(selected.phone),
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                  ),
                  if (selected.rewardReady)
                    const StatusPill(label: 'Ödül', tone: PillTone.success),
                ],
              ),
              const SizedBox(height: 14),
              if (showClassicStamp) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 8,
                    backgroundColor: c.surface,
                    color: selected.rewardReady ? kAmber : kBrand,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  stampsRequired == null
                      ? 'Damga: ${selected.stampCount}'
                      : '${selected.stampCount} / $stampsRequired'
                          '${selected.rewardReady ? ' · ${rewardLabel ?? ''}' : ''}',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
                const SizedBox(height: 18),
                if (program != null &&
                    program!.isMultiStamp &&
                    program!.stampOptions.isNotEmpty) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: program!.stampOptions.map((opt) {
                      final isSelected = selectedChipId == opt.id;
                      final label = opt.multiplier > 1
                          ? '${opt.label} (${opt.multiplier}x)'
                          : opt.label;
                      return ChoiceChip(
                        label: Text(label),
                        selected: isSelected,
                        onSelected:
                            busy ? null : (_) => onChipSelected(opt.id),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                ],
                FilledButton.icon(
                  onPressed: busy || selected.rewardReady ? null : onStamp,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Damga ekle'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: busy || !selected.rewardReady
                      ? null
                      : () => onRedeem(),
                  icon: const Icon(Icons.card_giftcard_rounded),
                  label: const Text('Ödül kullan'),
                ),
                const SizedBox(height: 10),
              ] else if (primaryMultiStamp != null) ...[
                Text(
                  primaryMultiStamp!.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Çoklu damga · ${selected.stampCount}/$multiStampRequired',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
                if (primaryMultiStamp!.stampOptions.length > 1) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: primaryMultiStamp!.stampOptions.map((opt) {
                      final isSelected = selectedChipId == opt.id;
                      final label = opt.multiplier > 1
                          ? '${opt.label} (${opt.multiplier}x)'
                          : opt.label;
                      return ChoiceChip(
                        label: Text(label),
                        selected: isSelected,
                        onSelected:
                            busy ? null : (_) => onChipSelected(opt.id),
                      );
                    }).toList(),
                  ),
                ],
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: busy || selected.rewardReady ? null : onStamp,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Damga ekle'),
                ),
                if (selected.rewardReady) ...[
                  const SizedBox(height: 10),
                  OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () => onRedeem(rewardLabel: rewardLabel ?? 'Ödül'),
                    icon: const Icon(Icons.card_giftcard_rounded),
                    label: Text('Ödül kullan — ${rewardLabel ?? 'Ödül'}'),
                  ),
                ],
                ...multiStampTiers.map((tier) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: OutlinedButton(
                      onPressed: busy || selected.stampCount < tier.redeemCost
                          ? null
                          : () => onRedeem(
                                tierId: tier.id,
                                rewardLabel: tier.rewardLabel,
                              ),
                      child: Text(
                        '${tier.redeemCost} damga → ${tier.rewardLabel}',
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 10),
              ],
              OutlinedButton.icon(
                onPressed: busy ? null : onWalletInvite,
                icon: const Icon(Icons.qr_code_2_rounded),
                label: const Text('Wallet davet QR'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
