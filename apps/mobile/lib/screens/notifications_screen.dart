import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _message = TextEditingController();
  NotifyStatus? _status;
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String? _ok;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _message.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await context.read<AuthState>().api.notificationStatus();
      if (mounted) setState(() => _status = s);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final text = _message.text.trim();
    if (text.length < 2) {
      setState(() => _error = 'En az 2 karakter girin');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _ok = null;
    });
    try {
      final res = await context.read<AuthState>().api.sendNotification(text);
      if (mounted) {
        setState(() {
          _ok =
              '${res.devices} cihaza gönderildi · ${res.synced} pass güncellendi';
          _message.clear();
        });
      }
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _status == null) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }

    final s = _status;

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
        if (s != null) ...[
          Row(
            children: [
              Expanded(
                child: MetricTile(
                  label: 'Kayıtlı cihaz',
                  value: '${s.registeredDevices}',
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: MetricTile(
                  label: 'Apple pass',
                  value: '${s.applePassCount}',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PremiumCard(
            child: Text(
              s.registeredDevices == 0
                  ? 'Henüz Wallet cihazı yok. Müşteriler pass ekledikten sonra '
                      'duyuru gönderebilirsiniz.'
                  : 'Mesaj kayıtlı Apple Wallet cihazlarına push olarak gider '
                      've pass arka yüzü güncellenir.',
              style: const TextStyle(color: kMuted, height: 1.45),
            ),
          ),
          if (s.lastMessage != null) ...[
            const SizedBox(height: 12),
            PremiumCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Son duyuru',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(s.lastMessage!),
                  if (s.lastSentAt != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      shortDate(s.lastSentAt),
                      style: const TextStyle(color: kMuted, fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
        ],
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _message,
                maxLines: 4,
                maxLength: 120,
                decoration: const InputDecoration(
                  labelText: 'Duyuru metni',
                  hintText: 'Örn: Bugün tüm filtre kahvelerde %20 indirim!',
                ),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _sending ? null : _send,
                child: Text(_sending ? 'Gönderiliyor…' : 'Wallet\'a gönder'),
              ),
            ],
          ),
        ),
        if (s != null && s.history.isNotEmpty) ...[
          const SizedBox(height: 20),
          const SectionLabel('Geçmiş'),
          const SizedBox(height: 8),
          ...s.history.take(8).map(
                (h) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: PremiumCard(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(h.message),
                        const SizedBox(height: 6),
                        Text(
                          '${shortDate(h.createdAt)} · ${h.devices} cihaz',
                          style: const TextStyle(color: kMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
        ],
      ],
    );
  }
}
