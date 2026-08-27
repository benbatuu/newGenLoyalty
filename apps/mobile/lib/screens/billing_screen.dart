import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/ui.dart';

class BillingScreen extends StatefulWidget {
  const BillingScreen({super.key});

  @override
  State<BillingScreen> createState() => _BillingScreenState();
}

class _BillingScreenState extends State<BillingScreen> {
  TenantProfile? _tenant;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final t = await context.read<AuthState>().api.tenantMe();
      if (mounted) setState(() => _tenant = t);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _statusLabel(String status) => switch (status) {
        'TRIAL' => 'Deneme',
        'ACTIVE' => 'Aktif',
        'CANCELLED' => 'İptal',
        'SUSPENDED' => 'Askıda',
        _ => status,
      };

  String _statusHint(String status) => switch (status) {
        'TRIAL' =>
          'Ücretsiz deneme sürecindesiniz. Aktif paket için destek ile iletişime geçin.',
        'ACTIVE' => 'Aboneliğiniz aktif. Tüm özellikler kullanılabilir.',
        'CANCELLED' =>
          'Abonelik iptal edilmiş. Yeniden açmak için destek ile konuşun.',
        'SUSPENDED' =>
          'Hesap geçici olarak askıya alınmış. Destek ekibi yardımcı olur.',
        _ => '',
      };

  PillTone _statusTone(String status) => switch (status) {
        'ACTIVE' => PillTone.success,
        'TRIAL' || 'SUSPENDED' => PillTone.warning,
        'CANCELLED' => PillTone.warning,
        _ => PillTone.neutral,
      };

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kAccent));
    }
    if (_error != null) {
      return EmptyState(title: _error!);
    }

    final t = _tenant!;
    final status = t.subscriptionStatus;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        GradientHero(
          title: t.name,
          subtitle: '${t.planCode} · ₺${t.planPriceTry}/ay',
        ),
        const SizedBox(height: 14),
        PremiumCard(
          child: Row(
            children: [
              StatusPill(label: _statusLabel(status), tone: _statusTone(status)),
              const Spacer(),
              Text(
                t.isActive ? 'Hesap açık' : 'Hesap kapalı',
                style: TextStyle(
                  color: t.isActive ? kAccent : Colors.red,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _row('Plan kodu', t.planCode),
              _row('Aylık ücret', '₺${t.planPriceTry}'),
              _row(
                'Aktivasyon',
                t.subscriptionActivatedAt != null
                    ? _fmt(t.subscriptionActivatedAt!)
                    : 'Henüz aktifleştirilmedi',
              ),
              if (t.createdAt != null)
                _row('Hesap açılışı', _fmt(t.createdAt!)),
            ],
          ),
        ),
        const SizedBox(height: 16),
        PremiumCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Ne dahil?',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              const SizedBox(height: 12),
              ...[
                'Sınırsız müşteri kaydı',
                'Apple Wallet damga kartı',
                'Kasiyer hesapları',
                'Anlık Wallet bildirimi',
                'Raporlar & özet paneli',
              ].map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(top: 7, right: 10),
                        decoration: const BoxDecoration(
                          color: kAccent,
                          shape: BoxShape.circle,
                        ),
                      ),
                      Expanded(child: Text(item)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _statusHint(status),
                style: const TextStyle(color: kMuted, height: 1.45, fontSize: 13),
              ),
              const SizedBox(height: 8),
              const Text(
                'Faturalama: destek@dokunkazan.com',
                style: TextStyle(color: kMuted, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () async {
            await Clipboard.setData(
              ClipboardData(text: 'https://dokunkazan.com/${t.slug}'),
            );
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Davet URL kopyalandı')),
              );
            }
          },
          child: const Text('Davet URL kopyala'),
        ),
      ],
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: kMuted)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  String _fmt(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}
