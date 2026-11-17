import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterMembershipPanel extends StatelessWidget {
  const CounterMembershipPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.membershipState,
    required this.membershipPlanId,
    required this.busy,
    required this.onSelectProgram,
    required this.onPlanSelected,
    required this.onActivateMembership,
    required this.onUseBenefit,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final MembershipState? membershipState;
  final String? membershipPlanId;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final void Function(String planId) onPlanSelected;
  final VoidCallback onActivateMembership;
  final void Function(String benefitLabel) onUseBenefit;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Üyelik'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'MEMBERSHIP_CARD',
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
              if (membershipState != null) ...[
                const SizedBox(height: 8),
                Text(
                  'Durum: ${membershipState!.status}'
                      '${membershipState!.plan != null ? ' · ${membershipState!.plan!.label}' : ''}',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
                if (membershipState!.expiresAt != null)
                  Text(
                    'Bitiş: ${membershipState!.expiresAt!.substring(0, 10)}',
                    style: TextStyle(color: c.muted, fontSize: 13),
                  ),
              ],
              if (membershipState?.status == 'inactive' &&
                  (membershipState?.plans.isNotEmpty == true)) ...[
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: membershipState!.plans.map((plan) {
                    return ChoiceChip(
                      label: Text(plan.label),
                      selected: membershipPlanId == plan.id,
                      onSelected:
                          busy ? null : (_) => onPlanSelected(plan.id),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: busy || membershipPlanId == null
                      ? null
                      : onActivateMembership,
                  icon: const Icon(Icons.card_membership_rounded),
                  label: const Text('Üyeliği aktifleştir'),
                ),
              ],
              if (membershipState != null &&
                  membershipState!.benefitQuota.isNotEmpty &&
                  membershipState!.status != 'inactive') ...[
                const SizedBox(height: 12),
                ...membershipState!.benefitQuota.entries.map((entry) {
                  if (entry.value <= 0) return const SizedBox.shrink();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: OutlinedButton(
                      onPressed: busy
                          ? null
                          : () => onUseBenefit(entry.key),
                      child: Text('${entry.key} (${entry.value} kaldı)'),
                    ),
                  );
                }),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
