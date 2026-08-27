import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../config.dart';
import '../models.dart';
import '../push_service.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  PushSettings? _push;
  bool _pushLoading = false;
  bool _pushSaving = false;
  String? _pushError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPush());
  }

  Future<void> _loadPush() async {
    final user = context.read<AuthState>().user;
    if (user == null || !user.isOwner) return;
    setState(() {
      _pushLoading = true;
      _pushError = null;
    });
    try {
      final s = await context.read<AuthState>().api.pushSettings();
      if (mounted) setState(() => _push = s);
    } on ApiException catch (e) {
      if (mounted) setState(() => _pushError = e.message);
    } finally {
      if (mounted) setState(() => _pushLoading = false);
    }
  }

  Future<void> _togglePush(bool value) async {
    final auth = context.read<AuthState>();
    setState(() {
      _pushSaving = true;
      _pushError = null;
    });
    try {
      await PushService.setEnabled(auth.api, auth.user, value);
      await _loadPush();
    } on ApiException catch (e) {
      if (mounted) setState(() => _pushError = e.message);
    } finally {
      if (mounted) setState(() => _pushSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthState>().user!;
    final roleLabel = switch (user.role) {
      'STORE_OWNER' => 'Kafe sahibi',
      'CASHIER' => 'Kasiyer',
      _ => user.role,
    };

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        PremiumCard(
          child: Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [kAccent, kAccentSoft],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(18),
                ),
                alignment: Alignment.center,
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(user.email, style: const TextStyle(color: kMuted)),
                    const SizedBox(height: 8),
                    StatusPill(label: roleLabel, tone: PillTone.success),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (user.isOwner) ...[
          const SizedBox(height: 16),
          PremiumCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Push bildirimleri',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Günlük özet (21:00), haftalık özet (Pazartesi 09:00) '
                            've hesap/abonelik güncellemeleri.',
                            style: TextStyle(color: kMuted, height: 1.4, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    if (_pushLoading || _pushSaving)
                      const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      Switch(
                        value: _push?.enabled ?? true,
                        onChanged: _push == null ? null : _togglePush,
                        activeThumbColor: kAccent,
                      ),
                  ],
                ),
                if (_pushError != null) ...[
                  const SizedBox(height: 8),
                  Text(_pushError!, style: const TextStyle(color: Colors.red)),
                ],
                if (_push != null && !_push!.fcmConfigured) ...[
                  const SizedBox(height: 10),
                  const Text(
                    'Sunucu FCM anahtarı henüz yapılandırılmamış — bildirimler '
                    'API tarafında hazır olunca iletilecek.',
                    style: TextStyle(color: kMuted, fontSize: 12, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
        ],
        const SizedBox(height: 16),
        PremiumCard(
          child: Column(
            children: [
              _row('API', kApiBaseUrl),
              const Divider(height: 24),
              _row(
                'Rol yetkisi',
                user.isOwner
                    ? 'Özet, tezgâh, müşteriler, program yönetimi'
                    : 'Tezgâh (telefon + QR damga)',
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: () => context.read<AuthState>().logout(),
          icon: const Icon(Icons.logout_rounded),
          label: const Text('Çıkış yap'),
          style: FilledButton.styleFrom(
            backgroundColor: kInk,
          ),
        ),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(label, style: const TextStyle(color: kMuted)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}
