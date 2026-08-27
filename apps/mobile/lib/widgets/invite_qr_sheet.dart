import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../theme.dart';

Future<void> showInviteQrSheet(
  BuildContext context, {
  required String url,
  String? phoneLabel,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _InviteQrSheet(url: url, phoneLabel: phoneLabel),
  );
}

class _InviteQrSheet extends StatefulWidget {
  const _InviteQrSheet({required this.url, this.phoneLabel});

  final String url;
  final String? phoneLabel;

  @override
  State<_InviteQrSheet> createState() => _InviteQrSheetState();
}

class _InviteQrSheetState extends State<_InviteQrSheet> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.url));
    setState(() => _copied = true);
    if (mounted) {
      Future<void>.delayed(const Duration(seconds: 2), () {
        if (mounted) setState(() => _copied = false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        20 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: kPanel,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: kLine),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: kLine,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          Text(
            'Wallet davet QR',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            widget.phoneLabel != null
                ? 'Müşteri (${widget.phoneLabel}) bu kodu tarayıp Wallet\'a eklesin.'
                : 'Müşteri bu kodu tarayıp Wallet\'a eklesin.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: kMuted, height: 1.4),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: kLine),
            ),
            child: QrImageView(
              data: widget.url,
              size: 220,
              backgroundColor: Colors.white,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: kInk,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: kInk,
              ),
            ),
          ),
          const SizedBox(height: 14),
          SelectableText(
            widget.url,
            style: const TextStyle(fontSize: 11, color: kMuted, height: 1.4),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _copy,
                  child: Text(_copied ? 'Kopyalandı' : 'Linki kopyala'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Kapat'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
