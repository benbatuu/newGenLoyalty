import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth_state.dart';
import '../theme.dart';
import 'account_screen.dart';
import 'cashier_screen.dart';
import 'customers_screen.dart';
import 'metrics_screen.dart';
import 'program_screen.dart';

class _TabSpec {
  const _TabSpec({
    required this.label,
    required this.icon,
    required this.selectedIcon,
    required this.page,
  });

  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Widget page;
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  List<_TabSpec> get _ownerTabs => [
        const _TabSpec(
          label: 'Özet',
          icon: Icons.dashboard_outlined,
          selectedIcon: Icons.dashboard_rounded,
          page: MetricsScreen(),
        ),
        const _TabSpec(
          label: 'Tezgâh',
          icon: Icons.storefront_outlined,
          selectedIcon: Icons.storefront_rounded,
          page: CashierScreen(),
        ),
        const _TabSpec(
          label: 'Müşteriler',
          icon: Icons.groups_outlined,
          selectedIcon: Icons.groups_rounded,
          page: CustomersScreen(),
        ),
        const _TabSpec(
          label: 'Program',
          icon: Icons.tune_outlined,
          selectedIcon: Icons.tune_rounded,
          page: ProgramScreen(),
        ),
        const _TabSpec(
          label: 'Hesap',
          icon: Icons.person_outline_rounded,
          selectedIcon: Icons.person_rounded,
          page: AccountScreen(),
        ),
      ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final user = auth.user!;

    if (user.role == 'SUPER_ADMIN') {
      return Scaffold(
        appBar: AppBar(title: const Text('Dokun & Kazan')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Süper admin için personel uygulaması yok.\nTenant yönetimini web panelinden yapın.',
              textAlign: TextAlign.center,
              style: TextStyle(color: kMuted, height: 1.45),
            ),
          ),
        ),
      );
    }

    if (user.isCashier) {
      return Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tezgâh'),
              Text(
                user.name,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: kMuted,
                ),
              ),
            ],
          ),
          actions: [
            IconButton(
              tooltip: 'Çıkış',
              onPressed: () => auth.logout(),
              icon: const Icon(Icons.logout_rounded),
            ),
          ],
        ),
        body: const CashierScreen(),
      );
    }

    final tabs = _ownerTabs;
    final safeIndex = _index.clamp(0, tabs.length - 1);
    final current = tabs[safeIndex];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(current.label),
            Text(
              'Sahip · ${user.name}',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: kMuted,
              ),
            ),
          ],
        ),
      ),
      body: IndexedStack(
        index: safeIndex,
        children: tabs.map((t) => t.page).toList(),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: kLine)),
        ),
        child: NavigationBar(
          selectedIndex: safeIndex,
          onDestinationSelected: (i) => setState(() => _index = i),
          destinations: tabs
              .map(
                (t) => NavigationDestination(
                  icon: Icon(t.icon),
                  selectedIcon: Icon(t.selectedIcon),
                  label: t.label,
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}
