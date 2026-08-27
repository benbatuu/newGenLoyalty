import 'package:flutter/material.dart';

import '../theme.dart';
import '../widgets/ui.dart';
import 'billing_screen.dart';
import 'business_screen.dart';
import 'notifications_screen.dart';
import 'reports_screen.dart';
import 'reward_screen.dart';
import 'staff_screen.dart';

class ProgramScreen extends StatelessWidget {
  const ProgramScreen({super.key});

  void _open(BuildContext context, Widget screen, String title) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text(title)),
          body: screen,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        HubTile(
          icon: Icons.card_giftcard_outlined,
          title: 'Ödül kuralı',
          subtitle: 'X damga → ödül metinleri',
          onTap: () => _open(context, const RewardScreen(), 'Ödül kuralı'),
        ),
        const SizedBox(height: 8),
        HubTile(
          icon: Icons.campaign_outlined,
          title: 'Bildirimler',
          subtitle: 'Wallet duyurusu gönder',
          onTap: () =>
              _open(context, const NotificationsScreen(), 'Bildirimler'),
          tone: kAccentSoft,
        ),
        const SizedBox(height: 8),
        HubTile(
          icon: Icons.badge_outlined,
          title: 'Ekip',
          subtitle: 'Kasiyer davet ve yönetim',
          onTap: () => _open(context, const StaffScreen(), 'Ekip'),
        ),
        const SizedBox(height: 8),
        HubTile(
          icon: Icons.storefront_outlined,
          title: 'Davet sayfası',
          subtitle: 'Profil, form, önizleme linki',
          onTap: () => _open(context, const BusinessScreen(), 'Davet sayfası'),
          tone: kGold,
        ),
        const SizedBox(height: 8),
        HubTile(
          icon: Icons.receipt_long_outlined,
          title: 'Abonelik',
          subtitle: 'Paket ve hesap durumu',
          onTap: () => _open(context, const BillingScreen(), 'Abonelik'),
        ),
        const SizedBox(height: 8),
        HubTile(
          icon: Icons.bar_chart_rounded,
          title: 'Raporlar',
          subtitle: 'Detaylı hareket listesi',
          onTap: () => _open(context, const ReportsScreen(), 'Raporlar'),
          tone: const Color(0xFF52796F),
        ),
        const SizedBox(height: 16),
        const PremiumCard(
          child: Text(
            'Kart tasarımı (logo, damga ikonu, renkler) web admin panelinde '
            'Settings → Kart tasarımı bölümünden düzenlenir.',
            style: TextStyle(color: kMuted, height: 1.45, fontSize: 13),
          ),
        ),
      ],
    );
  }
}
