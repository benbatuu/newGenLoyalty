import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth_state.dart';
import '../config.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

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
        const SizedBox(height: 16),
        PremiumCard(
          child: Column(
            children: [
              _row('API', kApiBaseUrl),
              const Divider(height: 24),
              _row(
                'Rol yetkisi',
                user.isOwner
                    ? 'Tezgâh, müşteriler, raporlar, kafe'
                    : 'Tezgâh ve günlük özet',
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
