import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme.dart';

class MobileNavItem {
  const MobileNavItem({
    required this.label,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Yüzen, yuvarlatılmış alt menü — seçili sekme dolu kapsül.
class MobileNavBar extends StatelessWidget {
  const MobileNavBar({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onSelect,
  });

  final List<MobileNavItem> items;
  final int currentIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bottom = MediaQuery.paddingOf(context).bottom;

    return Container(
      decoration: BoxDecoration(
        color: c.navBarBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        boxShadow: [
          BoxShadow(
            color: c.cardShadow,
            blurRadius: 24,
            offset: const Offset(0, -6),
          ),
        ],
        border: Border(top: BorderSide(color: c.lineSoft)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(8, 10, 8, bottom > 0 ? bottom : 12),
        child: Row(
          children: List.generate(items.length, (i) {
            final item = items[i];
            final selected = i == currentIndex;
            return Expanded(
              child: _NavSlot(
                label: item.label,
                icon: selected ? item.selectedIcon : item.icon,
                selected: selected,
                onTap: () => onSelect(i),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _NavSlot extends StatelessWidget {
  const _NavSlot({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: selected ? c.navSelectedBg : Colors.transparent,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: selected
                      ? [
                          BoxShadow(
                            color: c.heroShadow,
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Icon(
                  icon,
                  size: 22,
                  color: selected ? c.navSelectedFg : c.navUnselectedFg,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.dmSans(
                  fontSize: 10,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                  color: selected ? c.ink : c.navUnselectedFg,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
