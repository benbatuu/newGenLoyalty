import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

/// Kasiyer ana ekranı: telefon + numpad + ara / yeni kayıt + damga.
class CashierScreen extends StatefulWidget {
  const CashierScreen({super.key});

  @override
  State<CashierScreen> createState() => _CashierScreenState();
}

class _CashierScreenState extends State<CashierScreen> {
  String _digits = '';
  List<Customer> _results = [];
  Customer? _selected;
  int? _stampsRequired;
  String? _rewardLabel;
  bool _busy = false;

  ApiClient get _api => context.read<AuthState>().api;

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: kAccent,
      ),
    );
  }

  void _append(String d) {
    HapticFeedback.selectionClick();
    setState(() {
      if (_digits.length >= 11) return;
      _digits += d;
      _selected = null;
      _results = [];
    });
  }

  void _backspace() {
    HapticFeedback.selectionClick();
    if (_digits.isEmpty) return;
    setState(() {
      _digits = _digits.substring(0, _digits.length - 1);
      _selected = null;
      _results = [];
    });
  }

  void _clear() {
    HapticFeedback.mediumImpact();
    setState(() {
      _digits = '';
      _results = [];
      _selected = null;
      _stampsRequired = null;
      _rewardLabel = null;
    });
  }

  String get _displayPhone {
    if (_digits.isEmpty) return 'Telefon girin';
    final buf = StringBuffer();
    for (var i = 0; i < _digits.length; i++) {
      if (i == 4 || i == 7 || i == 9) buf.write(' ');
      buf.write(_digits[i]);
    }
    return buf.toString();
  }

  Future<void> _search() async {
    if (_digits.length < 3) {
      _toast('En az 3 hane girin');
      return;
    }
    setState(() => _busy = true);
    try {
      final list = await _api.findCustomers(_digits);
      setState(() {
        _results = list;
        _selected = list.length == 1 ? list.first : null;
        if (list.length == 1) {
          _stampsRequired = null;
        }
      });
      if (list.isEmpty) {
        _toast('Kayıt yok — Yeni kayıt ile ekleyin');
      }
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _register() async {
    if (_digits.length < 10) {
      _toast('Geçerli bir telefon girin (05xx…)');
      return;
    }
    setState(() => _busy = true);
    try {
      final phone = _digits.startsWith('0') ? _digits : '0$_digits';
      final r = await _api.registerCustomer(phone);
      setState(() {
        _selected = r.customer;
        _results = [r.customer];
        _stampsRequired = r.stampsRequired;
        _rewardLabel = r.rewardLabel;
      });
      if (r.walletInviteUrl != null) {
        debugPrint('[SMS mock] Wallet invite: ${r.walletInviteUrl}');
        _toast('Kayıt OK — invite linki kopyalandı (konsol)');
        // ignore: avoid_print
        print('\n════════ WALLET INVITE ════════\n${r.walletInviteUrl}\n═══════════════════════════════\n');
      } else {
        _toast('Kayıt + ilk damga tamam (invite yok — API loga bak)');
      }
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _stamp() async {
    final c = _selected;
    if (c == null) return;
    setState(() => _busy = true);
    try {
      final r = await _api.addStamp(c.id);
      setState(() {
        _selected = r.customer;
        _stampsRequired = r.stampsRequired;
        _rewardLabel = r.rewardLabel;
        _results = _results
            .map((x) => x.id == r.customer.id ? r.customer : x)
            .toList();
      });
      _toast(
        r.customer.rewardReady
            ? 'Ödül hazır: ${r.rewardLabel}'
            : 'Damga ${r.customer.stampCount}/${r.stampsRequired}',
      );
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _redeem() async {
    final c = _selected;
    if (c == null) return;
    setState(() => _busy = true);
    try {
      final r = await _api.redeem(c.id);
      setState(() {
        _selected = r.customer;
        _results = _results
            .map((x) => x.id == r.customer.id ? r.customer : x)
            .toList();
      });
      _toast('Ödül kullanıldı: ${r.redeemed}');
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final required = _stampsRequired ?? 10;
    final progress = _selected == null
        ? 0.0
        : (_selected!.stampCount / required).clamp(0.0, 1.0);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            children: [
              // Phone display
              PremiumCard(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SectionLabel('Telefon'),
                          const SizedBox(height: 6),
                          Text(
                            _displayPhone,
                            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                  color: _digits.isEmpty ? kMuted : kInk,
                                  letterSpacing: 0.5,
                                ),
                          ),
                        ],
                      ),
                    ),
                    if (_digits.isNotEmpty)
                      IconButton(
                        onPressed: _busy ? null : _clear,
                        icon: const Icon(Icons.close_rounded),
                        color: kMuted,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: _busy ? null : _search,
                      child: const Text('Ara'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : _register,
                      child: const Text('Yeni kayıt'),
                    ),
                  ),
                ],
              ),
              if (_results.length > 1) ...[
                const SizedBox(height: 14),
                const SectionLabel('Sonuçlar'),
                const SizedBox(height: 8),
                ..._results.map((c) {
                  final selected = _selected?.id == c.id;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: PremiumCard(
                      onTap: () => setState(() {
                        _selected = c;
                        _stampsRequired = null;
                      }),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              formatPhone(c.phone),
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: selected ? kAccent : kInk,
                              ),
                            ),
                          ),
                          Text(
                            '${c.stampCount} damga',
                            style: const TextStyle(color: kMuted, fontSize: 13),
                          ),
                          if (c.rewardReady) ...[
                            const SizedBox(width: 8),
                            const StatusPill(
                              label: 'Ödül',
                              tone: PillTone.success,
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                }),
              ],
              if (_selected != null) ...[
                const SizedBox(height: 12),
                PremiumCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              formatPhone(_selected!.phone),
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          if (_selected!.rewardReady)
                            const StatusPill(
                              label: 'Ödül hazır',
                              tone: PillTone.success,
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 8,
                          backgroundColor: kAccentMist,
                          color: _selected!.rewardReady ? kGold : kAccent,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _stampsRequired == null
                            ? 'Damga: ${_selected!.stampCount}'
                            : '${_selected!.stampCount} / $_stampsRequired'
                                '${_selected!.rewardReady && _rewardLabel != null ? ' · $_rewardLabel' : ''}',
                        style: const TextStyle(color: kMuted, fontSize: 13),
                      ),
                      const SizedBox(height: 14),
                      FilledButton.icon(
                        onPressed: _busy ? null : _stamp,
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Damga ekle'),
                      ),
                      if (_selected!.rewardReady) ...[
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: _busy ? null : _redeem,
                          icon: const Icon(Icons.card_giftcard_rounded),
                          label: const Text('Ödül kullan'),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        // Always-visible numpad
        SafeArea(
          top: false,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            decoration: const BoxDecoration(
              color: kPanel,
              border: Border(top: BorderSide(color: kLine)),
            ),
            child: _Numpad(
              enabled: !_busy,
              onDigit: _append,
              onBackspace: _backspace,
              onClear: _clear,
            ),
          ),
        ),
      ],
    );
  }
}

class _Numpad extends StatelessWidget {
  const _Numpad({
    required this.onDigit,
    required this.onBackspace,
    required this.onClear,
    required this.enabled,
  });

  final void Function(String) onDigit;
  final VoidCallback onBackspace;
  final VoidCallback onClear;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final keys = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '⌫'],
    ];

    return Column(
      children: keys.map((row) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            children: row.map((key) {
              if (key.isEmpty) {
                return const Expanded(child: SizedBox.shrink());
              }
              final isBack = key == '⌫';
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Material(
                    color: isBack ? kAccentMist : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      onTap: !enabled
                          ? null
                          : () => isBack ? onBackspace() : onDigit(key),
                      onLongPress: !enabled || !isBack ? null : onClear,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: kLine),
                        ),
                        child: isBack
                            ? const Icon(Icons.backspace_outlined, color: kInk)
                            : Text(
                                key,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w600,
                                  color: kInk,
                                ),
                              ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        );
      }).toList(),
    );
  }
}
