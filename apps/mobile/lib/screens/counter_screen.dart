import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});

  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  final _phone = TextEditingController();
  List<Customer> _results = [];
  Customer? _selected;
  int? _stampsRequired;
  String? _rewardLabel;
  DaySummary? _summary;
  bool _busy = false;

  ApiClient get _api => context.read<AuthState>().api;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSummary());
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    try {
      final s = await _api.daySummary();
      if (mounted) setState(() => _summary = s);
    } catch (_) {}
  }

  void _toast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: kAccent,
      ),
    );
  }

  Future<void> _search() async {
    setState(() => _busy = true);
    try {
      final list = await _api.findCustomers(_phone.text);
      setState(() {
        _results = list;
        _selected = null;
      });
      if (list.isEmpty) _toast('Kayıt yok — yeni müşteri ekleyebilirsiniz');
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _register() async {
    setState(() => _busy = true);
    try {
      final r = await _api.registerCustomer(_phone.text);
      setState(() {
        _selected = r.customer;
        _results = [r.customer];
        _stampsRequired = r.stampsRequired;
        _rewardLabel = r.rewardLabel;
      });
      if (r.walletInviteUrl != null) {
        debugPrint('[SMS mock] Wallet invite: ${r.walletInviteUrl}');
      }
      _toast(
        r.walletInviteUrl != null
            ? 'Kayıt tamam — Wallet linki konsolda'
            : 'Kayıt + ilk damga tamam',
      );
      await _loadSummary();
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
      await _loadSummary();
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
      await _loadSummary();
    } on ApiException catch (e) {
      _toast(e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _summary;
    final required = _stampsRequired ?? 10;
    final progress = _selected == null
        ? 0.0
        : (_selected!.stampCount / required).clamp(0.0, 1.0);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (s != null) ...[
          Row(
            children: [
              Expanded(
                child: MetricTile(
                  label: 'Bugün damga',
                  value: '${s.stampsToday}',
                  accent: true,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricTile(
                  label: 'Bugün ödül',
                  value: '${s.redeemsToday}',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricTile(
                  label: 'Hazır',
                  value: '${s.rewardReadyCount}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
        ],
        const SectionLabel('Müşteri'),
        const SizedBox(height: 10),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Telefon',
                  hintText: '05xx… veya son haneler',
                  prefixIcon: Icon(Icons.phone_iphone_rounded),
                ),
                onSubmitted: (_) => _busy ? null : _search(),
              ),
              const SizedBox(height: 14),
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
            ],
          ),
        ),
        if (_results.isNotEmpty) ...[
          const SizedBox(height: 22),
          const SectionLabel('Sonuçlar'),
          const SizedBox(height: 10),
          ..._results.map((c) {
            final selected = _selected?.id == c.id;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PremiumCard(
                onTap: () => setState(() {
                  _selected = c;
                  _stampsRequired = null;
                }),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: selected ? kAccent : kAccentMist,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.person_rounded,
                        color: selected ? Colors.white : kAccent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatPhone(c.phone),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          Text(
                            '${c.stampCount} damga',
                            style: const TextStyle(color: kMuted, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    if (c.rewardReady)
                      const StatusPill(label: 'Ödül hazır', tone: PillTone.success),
                  ],
                ),
              ),
            );
          }),
        ],
        if (_selected != null) ...[
          const SizedBox(height: 14),
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
                      const StatusPill(label: 'Ödül', tone: PillTone.success),
                  ],
                ),
                const SizedBox(height: 14),
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
                          '${_selected!.rewardReady ? ' · ${_rewardLabel ?? ''}' : ''}',
                  style: const TextStyle(color: kMuted, fontSize: 13),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _busy ? null : _stamp,
                  icon: const Icon(Icons.add_rounded),
                  label: const Text('Damga ekle'),
                ),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: _busy || !_selected!.rewardReady ? null : _redeem,
                  icon: const Icon(Icons.card_giftcard_rounded),
                  label: const Text('Ödül kullan'),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}
