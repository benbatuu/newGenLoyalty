import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';
import 'counter_program_picker.dart';

class CounterEventPanel extends StatelessWidget {
  const CounterEventPanel({
    super.key,
    required this.program,
    required this.programs,
    required this.selectedProgramId,
    required this.eventState,
    required this.busy,
    required this.onSelectProgram,
    required this.onCheckIn,
  });

  final ProgramSummary program;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final EventCustomerState? eventState;
  final bool busy;
  final void Function(String type, String id) onSelectProgram;
  final VoidCallback onCheckIn;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Etkinlik'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CounterProgramPicker(
                type: 'EVENT_CARD',
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
              if (eventState != null) ...[
                const SizedBox(height: 8),
                Text(
                  '${eventState!.eventName} · ${eventState!.entriesUsed}/${eventState!.entryLimit} giriş'
                      '${eventState!.venue != null ? ' · ${eventState!.venue}' : ''}',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
                Text(
                  '${eventState!.entriesRemaining} giriş hakkı kaldı',
                  style: TextStyle(color: c.muted, fontSize: 13),
                ),
              ],
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: busy || eventState?.canCheckIn != true
                    ? null
                    : onCheckIn,
                icon: const Icon(Icons.event_available_rounded),
                label: const Text('Check-in'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
