import 'package:flutter/material.dart';

import '../../../models.dart';

class CounterProgramPicker extends StatelessWidget {
  const CounterProgramPicker({
    super.key,
    required this.type,
    required this.programs,
    required this.selectedProgramId,
    required this.busy,
    required this.onSelect,
  });

  final String type;
  final List<ProgramSummary> programs;
  final Map<String, String> selectedProgramId;
  final bool busy;
  final void Function(String type, String id) onSelect;

  @override
  Widget build(BuildContext context) {
    if (programs.length <= 1) return const SizedBox.shrink();
    final selectedId = selectedProgramId[type] ?? programs.first.id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: programs.map((prog) {
          final selected = selectedId == prog.id;
          return ChoiceChip(
            label: Text(prog.name),
            selected: selected,
            onSelected: busy ? null : (_) => onSelect(type, prog.id),
          );
        }).toList(),
      ),
    );
  }
}
