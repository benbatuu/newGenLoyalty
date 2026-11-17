import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterStaffPanel extends StatelessWidget {
  const CounterStaffPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.staffState,
    required this.staffAmount,
    required this.staffPin,
    required this.staffInviteCode,
    required this.busy,
    required this.onSelectProgram,
    required this.onEnrollStaff,
    required this.onRedeemStaff,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final StaffState? staffState;
  final TextEditingController staffAmount;
  final TextEditingController staffPin;
  final TextEditingController staffInviteCode;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final VoidCallback onEnrollStaff;
  final VoidCallback onRedeemStaff;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Personel'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'STAFF_CARD',
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
              if (staffState != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Aylık: ₺${(staffState!.usage.monthlySpendKurus / 100).toStringAsFixed(2).replaceAll('.', ',')}'
                      ' / ₺${(staffState!.usage.monthlyBudgetKurus / 100).toStringAsFixed(2).replaceAll('.', ',')}'
                      ' · Günlük ${staffState!.usage.dailyRedeemCount}/${staffState!.usage.dailyLimit}',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
              ],
              const SizedBox(height: 12),
              TextField(
                onTapOutside: onTapOutsideDismissKeyboard,
                controller: staffInviteCode,
                decoration: const InputDecoration(
                  labelText: 'Davet kodu (opsiyonel)',
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: busy ? null : onEnrollStaff,
                icon: const Icon(Icons.badge_outlined),
                label: const Text('Personel kaydı'),
              ),
              const SizedBox(height: 18),
              const Divider(height: 1),
              const SizedBox(height: 14),
              TextField(
                onTapOutside: onTapOutsideDismissKeyboard,
                controller: staffAmount,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: const InputDecoration(
                  labelText: 'Kullanılacak tutar (TL)',
                  hintText: '47,50',
                ),
              ),
              if (staffState?.requireManagerPinAbove != null) ...[
                const SizedBox(height: 10),
                TextField(
                  onTapOutside: onTapOutsideDismissKeyboard,
                  controller: staffPin,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Yönetici PIN (gerekirse)',
                  ),
                ),
              ],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: busy || staffAmount.text.trim().isEmpty
                    ? null
                    : onRedeemStaff,
                icon: const Icon(Icons.redeem_rounded),
                label: const Text('Hak kullan'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
