import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../auth_state.dart';
import '../models.dart';
import '../notification_send_controller.dart';
import '../theme.dart';
import '../widgets/mobile_nav_bar.dart';
import '../widgets/send_blocking_overlay.dart';
import '../widgets/theme_toggle.dart';
import 'account_screen.dart';
import '../features/counter/counter_screen.dart';
import 'customers_screen.dart';
import 'metrics_screen.dart';
import 'notifications_screen.dart';

class _TabSpec {
  const _TabSpec({
    required this.label,
    required this.navItem,
    required this.page,
    this.showShellHeader = true,
  });

  final String label;
  final MobileNavItem navItem;
  final Widget page;
  final bool showShellHeader;
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  TenantProfile? _tenant;

  List<_TabSpec> get _ownerTabs => [
        _TabSpec(
          label: 'Özet',
          navItem: const MobileNavItem(
            label: 'Özet',
            icon: Icons.space_dashboard_outlined,
            selectedIcon: Icons.space_dashboard_rounded,
          ),
          page: const MetricsScreen(),
        ),
        _TabSpec(
          label: 'Tezgâh',
          navItem: const MobileNavItem(
            label: 'Tezgâh',
            icon: Icons.storefront_outlined,
            selectedIcon: Icons.storefront_rounded,
          ),
          page: const CounterScreen(),
        ),
        _TabSpec(
          label: 'Müşteriler',
          navItem: const MobileNavItem(
            label: 'Müşteri',
            icon: Icons.people_outline_rounded,
            selectedIcon: Icons.people_rounded,
          ),
          page: const CustomersScreen(),
        ),
        _TabSpec(
          label: 'Bildirimler',
          navItem: const MobileNavItem(
            label: 'Bildirim',
            icon: Icons.campaign_outlined,
            selectedIcon: Icons.campaign_rounded,
          ),
          page: const NotificationsScreen(),
        ),
        _TabSpec(
          label: 'Profil',
          navItem: const MobileNavItem(
            label: 'Profil',
            icon: Icons.account_circle_outlined,
            selectedIcon: Icons.account_circle_rounded,
          ),
          page: const AccountScreen(),
          showShellHeader: false,
        ),
      ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTenant());
  }

  Future<void> _loadTenant() async {
    try {
      final t = await context.read<AuthState>().api.tenantMe();
      if (mounted) setState(() => _tenant = t);
    } catch (_) {
      // Header falls back to user name
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final auth = context.watch<AuthState>();
    final user = auth.user!;

    if (user.role == 'SUPER_ADMIN') {
      return Scaffold(
        appBar: AppBar(title: const Text('StampWell')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Süper admin için personel uygulaması yok.\nTenant yönetimini web panelinden yapın.',
              textAlign: TextAlign.center,
              style: TextStyle(color: c.muted, height: 1.45),
            ),
          ),
        ),
      );
    }

    if (user.isCashier) {
      return Scaffold(
        backgroundColor: c.bg,
        appBar: AppBar(
          title: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.brandMist,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: kBrand,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tezgâh'),
                    Text(
                      user.name,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: c.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            const ThemePreferenceMenu(),
            IconButton(
              tooltip: 'Çıkış',
              onPressed: () => auth.logout(),
              icon: const Icon(Icons.logout_rounded),
            ),
          ],
        ),
        body: const CounterScreen(),
      );
    }

    final tabs = _ownerTabs;
    final safeIndex = _index.clamp(0, tabs.length - 1);
    final current = tabs[safeIndex];

    return ChangeNotifierProvider(
      create: (_) => NotificationSendController(),
      child: Builder(
        builder: (context) {
          final sending = context.watch<NotificationSendController>().sending;

          return Stack(
            children: [
              Scaffold(
                backgroundColor: c.bg,
                body: SafeArea(
                  bottom: false,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (current.showShellHeader)
                        _ShellHeader(
                          title: current.label,
                          subtitle: _tenant?.name ?? user.name,
                        ),
                      Expanded(
                        child: IndexedStack(
                          index: safeIndex,
                          children: tabs.map((t) => t.page).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
                bottomNavigationBar: MobileNavBar(
                  items: tabs.map((t) => t.navItem).toList(),
                  currentIndex: safeIndex,
                  onSelect: sending
                      ? (_) {}
                      : (i) => setState(() => _index = i),
                ),
              ),
              if (sending)
                const Positioned.fill(
                  child: SendBlockingOverlay(),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _ShellHeader extends StatelessWidget {
  const _ShellHeader({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: kBrand,
              shape: BoxShape.circle,
            ),
          ),
        ],
      ),
    );
  }
}
