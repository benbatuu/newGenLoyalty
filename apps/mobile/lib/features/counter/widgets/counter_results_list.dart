import 'package:flutter/material.dart';

import '../../../models.dart';
import '../../../theme.dart';
import '../../../widgets/ui.dart';

class CounterResultsList extends StatelessWidget {
  const CounterResultsList({
    super.key,
    required this.results,
    required this.selected,
    required this.onSelect,
  });

  final List<Customer> results;
  final Customer? selected;
  final void Function(Customer customer) onSelect;

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) return const SizedBox.shrink();
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 22),
        const SectionLabel('Sonuçlar'),
        const SizedBox(height: 10),
        ...results.map((customer) {
          final isSelected = selected?.id == customer.id;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: PremiumCard(
              onTap: () => onSelect(customer),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: isSelected ? c.ink : c.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? c.ink : c.line,
                      ),
                    ),
                    child: Icon(
                      Icons.person_rounded,
                      color: isSelected ? Colors.white : c.muted,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatPhone(customer.phone),
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          '${customer.stampCount} damga',
                          style: TextStyle(color: c.muted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  if (customer.rewardReady)
                    const StatusPill(
                      label: 'Ödül hazır',
                      tone: PillTone.success,
                    ),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }
}
