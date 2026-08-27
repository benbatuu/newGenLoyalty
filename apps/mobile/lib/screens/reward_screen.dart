import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class RewardScreen extends StatefulWidget {
  const RewardScreen({super.key});

  @override
  State<RewardScreen> createState() => _RewardScreenState();
}

class _RewardScreenState extends State<RewardScreen> {
  final _stamps = TextEditingController();
  final _label = TextEditingController();
  final _readyText = TextEditingController();
  final _stampMsg = TextEditingController();
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _ok;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _stamps.dispose();
    _label.dispose();
    _readyText.dispose();
    _stampMsg.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await context.read<AuthState>().api.tenantRewardSettings();
      _stamps.text = '${s.stampsRequired ?? 10}';
      _label.text = s.rewardLabel ?? '1 bedava kahve';
      _readyText.text = s.rewardReadyText ?? 'Ödül hazır!';
      _stampMsg.text = s.stampChangeMessage ?? 'Damga güncellendi: %@';
    } on ApiException catch (e) {
      _error = e.message;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final req = int.tryParse(_stamps.text.trim());
    if (req == null || req < 1) {
      setState(() => _error = 'Geçerli damga sayısı girin');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
      _ok = null;
    });
    try {
      final api = context.read<AuthState>().api;
      await api.updateRewardRule(
        stampsRequired: req,
        rewardLabel: _label.text.trim(),
      );
      await api.patchTenant({
        'rewardReadyText': _readyText.text.trim(),
        'stampChangeMessage': _stampMsg.text.trim(),
      });
      if (mounted) setState(() => _ok = 'Kaydedildi — Wallet pass\'ler güncelleniyor');
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        if (_ok != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(_ok!, style: const TextStyle(color: kAccent)),
          ),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _stamps,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Damga sayısı'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _label,
                decoration: const InputDecoration(labelText: 'Ödül metni'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _readyText,
                decoration: const InputDecoration(labelText: 'Ödül hazır metni'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _stampMsg,
                decoration: const InputDecoration(
                  labelText: 'Damga push mesajı (%@)',
                ),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _saving ? null : _save,
                child: Text(_saving ? 'Kaydediliyor…' : 'Kaydet'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
