import 'package:flutter/material.dart';

import '../models.dart';
import '../theme.dart';

const _walletTypes = {
  'STAMP_CARD',
  'MULTI_STAMP',
  'POINT_CARD',
  'CASHBACK_CARD',
  'DISCOUNT_CARD',
  'EVENT_CARD',
};

const _typeLabels = {
  'STAMP_CARD': 'Damga kartı',
  'MULTI_STAMP': 'Çoklu damga',
  'POINT_CARD': 'Puan kartı',
  'CASHBACK_CARD': 'Cashback kartı',
  'DISCOUNT_CARD': 'İndirim kartı',
  'EVENT_CARD': 'Etkinlik kartı',
};

class WalletInviteProgram {
  const WalletInviteProgram({
    required this.programId,
    required this.name,
    required this.type,
    required this.typeLabel,
    required this.summary,
  });

  final String programId;
  final String name;
  final String type;
  final String typeLabel;
  final String summary;
}

List<WalletInviteProgram> filterWalletPrograms(List<ProgramSummary> programs) {
  return programs
      .where((p) => _walletTypes.contains(p.type))
      .map((p) {
        final tier = p.tiers.isNotEmpty ? p.tiers.first : null;
        var summary = p.type;
        if (tier != null) {
          if (p.type == 'STAMP_CARD' || p.type == 'MULTI_STAMP') {
            summary = '${tier.threshold} damga · ${tier.rewardLabel}';
          } else {
            summary = tier.rewardLabel;
          }
        }
        return WalletInviteProgram(
          programId: p.id,
          name: p.name,
          type: p.type,
          typeLabel: _typeLabels[p.type] ?? p.type,
          summary: summary,
        );
      })
      .toList();
}

/// Returns selected program IDs, or null if cancelled.
Future<List<String>?> showWalletInvitePicker(
  BuildContext context, {
  required List<WalletInviteProgram> programs,
  String? phoneLabel,
  String title = 'Hangi kartlar eklensin?',
  String confirmLabel = 'Davet linki oluştur',
}) {
  return showModalBottomSheet<List<String>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _WalletInvitePickerSheet(
      programs: programs,
      phoneLabel: phoneLabel,
      title: title,
      confirmLabel: confirmLabel,
    ),
  );
}

class _WalletInvitePickerSheet extends StatefulWidget {
  const _WalletInvitePickerSheet({
    required this.programs,
    this.phoneLabel,
    required this.title,
    required this.confirmLabel,
  });

  final List<WalletInviteProgram> programs;
  final String? phoneLabel;
  final String title;
  final String confirmLabel;

  @override
  State<_WalletInvitePickerSheet> createState() =>
      _WalletInvitePickerSheetState();
}

class _WalletInvitePickerSheetState extends State<_WalletInvitePickerSheet> {
  late Set<String> _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.programs.map((p) => p.programId).toSet();
  }

  bool get _allSelected =>
      widget.programs.isNotEmpty &&
      widget.programs.every((p) => _selected.contains(p.programId));

  void _toggle(String id) {
    setState(() {
      if (_selected.contains(id)) {
        if (_selected.length <= 1) return;
        _selected.remove(id);
      } else {
        _selected.add(id);
      }
    });
  }

  void _toggleAll() {
    setState(() {
      if (_allSelected) {
        _selected = {widget.programs.first.programId};
      } else {
        _selected = widget.programs.map((p) => p.programId).toSet();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        20 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: c.panel,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: c.line),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: c.line,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          Text(
            widget.title,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          if (widget.phoneLabel != null) ...[
            const SizedBox(height: 6),
            Text(
              widget.phoneLabel!,
              style: TextStyle(color: c.muted, fontSize: 13),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'Müşteri tek davet linkinde seçtiğiniz kartları görecek ve Apple Wallet\'a ekleyebilecek.',
            style: TextStyle(color: c.muted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),
          CheckboxListTile(
            value: _allSelected,
            onChanged: (_) => _toggleAll(),
            title: const Text('Tümünü seç'),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          ...widget.programs.map((p) {
            final checked = _selected.contains(p.programId);
            return CheckboxListTile(
              value: checked,
              onChanged: (_) => _toggle(p.programId),
              title: Text(p.name),
              subtitle: Text('${p.typeLabel} · ${p.summary}'),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
            );
          }),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Vazgeç'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: FilledButton(
                  onPressed: _selected.isEmpty
                      ? null
                      : () => Navigator.pop(context, _selected.toList()),
                  child: Text(widget.confirmLabel),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
